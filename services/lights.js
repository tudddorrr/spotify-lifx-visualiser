const LifxClient = require('node-lifx').Client;
const _ = require('lodash');
const spotifyService = require('./spotify');
const NanoTimer = require('nanotimer');

const MUSIC_POLL_TIME = 2000;
// 0 = based on section volume, 1 = based on previous beat volume
const BEAT_MODE = 1;
// 0 = scroll through colour wheel, 1 = based on album's artwork
const COLOUR_MODE = 0;

var client = new LifxClient();
var audioAnalysis;

var loudest = -99;
var quietest = 99;
var lastBrightness = 0;
var paused = false;

function getLabel(light, callback) {
  light.getLabel(function(err, data) {
    if(err) return callback("Null");
    return callback(data);
  });
}

client.on('light-new', function(light) {
  light.on();
  light.color(_.random(0, 360), 100, 0, 9000, 150);    
  
  getLabel(light, function(name) {
    console.log(name + " connected!");    
  });
});

client.on('light-online', function(light) {
  getLabel(light, function(name) {
    console.log(name + " reconnected!");    
  });
});

client.on('light-offline', function(light) { 
  beatTimer.clearTimeout();
  console.log("A light disconnected!");    
});

client.init();

module.exports.getLights = function() {
  return client.lights().length>0;
}

var beatNum = 0;
var beatTimer;
module.exports.initBeat = function(analysis, user) {
  beatTimer = new NanoTimer();

  audioAnalysis = analysis;

  for(var i=0; i<audioAnalysis.segments.length; i++) {
    if(audioAnalysis.segments[i].loudness_max>loudest) loudest = audioAnalysis.segments[i].loudness_max;
    if(audioAnalysis.segments[i].loudness_max<quietest) quietest = audioAnalysis.segments[i].loudness_max;
  }
  queryCurrentTrack(user);
}

var albumColours = [];
var curColour = 0;
module.exports.setAlbumColours = function(colours) {
  albumColours = colours;
  curColour = randColourIndex();
}

function randColourIndex() {
  var rand = _.random(0, albumColours.length-1);
  while(rand===curColour) {
    rand = _.random(0, albumColours.length-1);
  }
  return rand;
}

function handleBeat() {
  if(beatNum>=audioAnalysis.segments.length || paused) return;

  var brightness = getBrightness();

  const brightnessDiff = Math.abs(brightness-lastBrightness);
  if(brightnessDiff>=30) {
    lastBrightness = brightness; 

    if(COLOUR_MODE===1) {
      setColourFromAlbum(brightness)
    } else {
      setColourFromWheel(brightness);  
    }  
  }

  beatNum++;
  if(beatNum<audioAnalysis.segments.length) beatTimer.setTimeout(() => handleBeat(), '', audioAnalysis.segments[beatNum].duration + 's');
}

function setColourFromWheel(brightness) {
  curColour+=30;

  client.lights().forEach(function(light) {
    light.color(curColour%360, 100, brightness, 9000, 150);        
  });
}

function setColourFromAlbum(brightness) {
  curColour = randColourIndex();
  const col = albumColours[curColour];

  client.lights().forEach(function(light) {
    light.color(col[0], col[1], brightness, 9000, 150);            
  });
}

function queryCurrentTrack(user) {
  spotifyService.getCurrentTrack(user, function(err, body) {
    if(err) {
      console.log(err);
    } else {
      if(!body.progress_ms) {
        console.log("Couldn't get current track");
      } else {
        updateBeatNum(body.progress_ms/1000);       
        paused = !body.is_playing;  
      }
    }

    setTimeout(() => queryCurrentTrack(user), MUSIC_POLL_TIME);
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
  return BEAT_MODE==0 ? getBrightnessSectionLoudness() : getBrightnessPrevBeat();
}

function getBrightnessSectionLoudness() {
  // set brightness based on this beat's volume in relation to the loudness of the section it's in
  const beatLoudness = audioAnalysis.segments[beatNum].loudness_max;
  const trackLoudness = audioAnalysis.sections[getSection()].loudness;
  const maxLoudnessDiff = (loudest-quietest);

  const brightness = (beatLoudness / trackLoudness) * (maxLoudnessDiff/100);

  return 100 - _.clamp(brightness*100, 0, 100);
}

function getBrightnessPrevBeat() {
  // set brightness based on the % difference between the current and previous beats' volumes
  if(beatNum==0) return 100;

  const prevBeatLoudness = audioAnalysis.segments[beatNum-1].loudness_max;
  const curBeatLoudness = audioAnalysis.segments[beatNum].loudness_max;

  const brightness = Math.round(Math.abs((curBeatLoudness/prevBeatLoudness)*100));
  return _.clamp(brightness, 0, 100);
}