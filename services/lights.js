const LifxClient = require('node-lifx').Client;
const _ = require('lodash');
const spotifyService = require('./spotify');
const MUSIC_POLL_TIME = 3000;

var client = new LifxClient();
var light;
var user;
var audioAnalysis;

var loudness = -999;
var lastBrightness = -999;
var colour = 0;

client.on('light-new', function(device) {
  console.log("Light connected!");
  light = device;
});

client.init();

module.exports.getLight = function() {
  return light;
}

var beatNum = 0;
var currBeatTimeout;
module.exports.initBeat = function(analysis, user) {
  audioAnalysis = analysis;
  light.user = user;

  for(var i=0; i<audioAnalysis.segments.length; i++) {
    if(audioAnalysis.segments[i].loudness_max>loudness) loudness = audioAnalysis.segments[i].loudness_max;
  }
  queryCurrentTrack();
}

function handleBeat() {
  if(!audioAnalysis.segments || beatNum>=audioAnalysis.segments.length) return;

  var brightness = getBrightness();

  const brightnessDiff = Math.abs(brightness-lastBrightness);
  if(brightnessDiff>=30) colour+=_.random(30, 60);
  light.color(colour%360, 100, brightness, 9000, 200);  
  lastBrightness = brightness;

  beatNum++;
  if(beatNum<audioAnalysis.segments.length) currBeatTimeout = setTimeout(() => handleBeat(), audioAnalysis.segments[beatNum].duration*1000);
}

function queryCurrentTrack() {
  spotifyService.getCurrentTrack(light.user, function(body) {
    updateBeatNum(body.progress_ms/1000);
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

  clearTimeout(currBeatTimeout);
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
  const brightness = Math.abs(audioAnalysis.segments[beatNum].loudness_max)/Math.abs(audioAnalysis.sections[getSection()].loudness);
  return 100 - _.clamp(Math.round(brightness*100), 10, 100);
}