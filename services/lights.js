const LifxClient = require('node-lifx').Client;
const _ = require('lodash');
const spotifyService = require('./spotify');
const NanoTimer = require('nanotimer');
const MUSIC_POLL_TIME = 3000;

var client = new LifxClient();
var light;
var user;
var audioAnalysis;

var loudest = -99;
var quietest = 99;
var lastBrightness = 0;
var colour = 0;

client.on('light-new', function(device) {
  console.log("Light connected!");
  light = device;
});

client.on('light-offline', function(device) {
  console.log("Light disconnected!");  
  beatTimer.clearTimeout();
});

client.init();

module.exports.getLight = function() {
  return light;
}

var beatNum = 0;
var beatTimer;
module.exports.initBeat = function(analysis, user) {
  beatTimer = new NanoTimer();

  audioAnalysis = analysis;
  light.user = user;

  for(var i=0; i<audioAnalysis.segments.length; i++) {
    if(audioAnalysis.segments[i].loudness_max>loudest) loudest = audioAnalysis.segments[i].loudness_max;
    if(audioAnalysis.segments[i].loudness_max<quietest) quietest = audioAnalysis.segments[i].loudness_max;
  }
  queryCurrentTrack();
}

function handleBeat() {
  if(beatNum>=audioAnalysis.segments.length) return;

  var brightness = getBrightness();

  const brightnessDiff = Math.abs(brightness-lastBrightness);
  if(brightnessDiff>=30) {
    lastBrightness = brightness;    
    colour+=30;
    if(audioAnalysis.segments) light.color(colour%360, 100, brightness, 9000, 150);      
  }

  beatNum++;
  if(beatNum<audioAnalysis.segments.length) beatTimer.setTimeout(() => handleBeat(), '', audioAnalysis.segments[beatNum].duration + 's');
}

function queryCurrentTrack() {
  spotifyService.getCurrentTrack(light.user, function(err, body) {
    if(err) {
      console.log(err);
    } else {
      updateBeatNum(body.progress_ms/1000);      
    }

    setTimeout(() => queryCurrentTrack(), MUSIC_POLL_TIME);
  });
}

function updateBeatNum(progress) {
  var prev = beatNum;
  for(var i=0; i<audioAnalysis.segments.length; i++) {
    const start = audioAnalysis.segments[i].start;
    const end = start+audioAnalysis.segments[i].duration;
    if(_.inRange(progress, start, end)) beatNum = i;
  }

  beatTimer.clearTimeout();
  handleBeat();
}

function getSection() {
  for(var i=0; i<audioAnalysis.sections.length; i++) {
    const start = audioAnalysis.sections[i].start;
    const end = start+audioAnalysis.sections[i].duration;
    if(_.inRange(audioAnalysis.segments[beatNum].start, start, end)) return i;
  }
  return 0;
}

function getBrightness() {
  const beatLoudness = audioAnalysis.segments[beatNum].loudness_max;
  const trackLoudness = audioAnalysis.sections[getSection()].loudness;
  const maxLoudnessDiff = (loudest-quietest);

  const brightness = (beatLoudness / trackLoudness) * (maxLoudnessDiff/100);

  return 100 - _.clamp(brightness*100, 0, 100);
}