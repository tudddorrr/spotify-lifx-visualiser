const LifxClient = require('node-lifx').Client;
const _ = require('lodash');
const spotifyService = require('./spotify');
const NanoTimer = require('nanotimer');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));

const MUSIC_POLL_TIME = 2000;
// 1 = based on section volume, 2 = based on previous beat volume
var BEAT_MODE = argv.b || argv.beatmode || 1;
// 1 = scroll through colour wheel, 2 = based on album's artwork, 3 = current colour + saturation shifts, 4 = purely current colour
var COLOUR_MODE = argv.c || argv.colourmode || 3;
// write audio analysis to a file
const WRITE_ANALYSIS = argv.w || argv.writeanalysis || false;
// max brightness
var MAX_BRIGHTNESS = argv.m || argv.maxbrightness || 100;
// min brightness
var MIN_BRIGHTNESS = argv.minbrightness || 0;
// lights to use
const LIGHTS_TO_USE = argv.l ? argv.l.toLowerCase().split(', ') : argv.lights ? argv.lights.toLowerCase().split(', ') : [];
// threshold that needs to be exceeded for a "new" beat
var BEAT_THRESHOLD = argv.t || argv.threshold || 40;
// minimum saturation of the color
var MIN_SATURATION = argv.s || argv.minsaturation || 0;
// range of the colors used (in degrees). 
var COLOUR_RANGE = argv.r || argv.colourrange || 0;
// default color
var DEFAULT_COLOUR = argv.d || argv.defaultcolour || '';

const lerp = 150;

var client = new LifxClient();
var lights = [];
var audioAnalysis;

var loudest = -99;
var quietest = 99;
var paused = false;

var curColour = 0;
var curSat = 0;
var initialSat = -1;
var lastBrightness = 0;

function getColorFromName(color_name) {
  switch(color_name) {
    case 'red':
      var colourValue = 0;
      break;
    case 'tamisepose':
      var colourValue = 45;
      break;    
    case 'yellow':
      var colourValue = 60;
      break;
    case 'green':
      var colourValue = 120;
      break;
    case 'cyan':
      var colourValue = 180;
      break;    
    case 'blue': 
      var colourValue = 240;
      break;
    case 'purple':
      var colourValue = 300;
      break;
    case 'pink':
      var colourValue = 330;
      break;    
    default:
      var colourValue = -1;
  }
  return colourValue;
}

module.exports.setMode = function (mode){
  switch (mode) {
    case 'chill':
      BEAT_MODE = 1;
      COLOUR_MODE = 3;
      MAX_BRIGHTNESS = 45;
      MIN_BRIGHTNESS = 40;
      MIN_SATURATION = 80;
      BEAT_THRESHOLD = 60;
      COLOUR_RANGE = 6;  
      break;
    case 'inter':
      BEAT_MODE = 1;
      COLOUR_MODE = 3;
      MAX_BRIGHTNESS = 45;
      MIN_BRIGHTNESS = 20;
      MIN_SATURATION = 80;
      BEAT_THRESHOLD = 20;
      COLOUR_RANGE = 20;      
      break;
    case 'edm':
      BEAT_MODE = 1;
      COLOUR_MODE = 3;
      MAX_BRIGHTNESS = 50;
      MIN_BRIGHTNESS = 0;
      MIN_SATURATION = 88;
      BEAT_THRESHOLD = 5;
      COLOUR_RANGE = 90;      
      break;

  }
}

var initialColor = getColorFromName(DEFAULT_COLOUR);

module.exports.setInitialColor = function (color) {
  initialColor = getColorFromName(color);
  return initialColor;
}

function getLabel(light, callback) {
  light.getLabel(function(err, data) {
    if(err) return callback("Null");
    return callback(data);
  });
}

client.on('light-new', function(light) {  
  getLabel(light, function(name) {
    console.log(name + " found"); 
    if(LIGHTS_TO_USE.length===0 || LIGHTS_TO_USE.indexOf(name.toLowerCase())!==-1) {  
      lights.push(light); 
      console.log(name + " connected!");          
    }
  });
});

client.on('light-online', function(light) {
  getLabel(light, function(name) {
    console.log(name + " reconnected");     
  });
});

client.on('light-offline', function(light) { 
  beatTimer.clearTimeout();
  console.log("A light disconnected");    
});

client.init();

module.exports.getLights = function() {
  return client.lights().length>0;
}

var beatNum = 0;
var beatTimer;
module.exports.initBeat = function(analysis, user, trackName) {
  beatTimer = new NanoTimer();

  if(!analysis || !analysis.segments) {
    queryCurrentTrack(user);
    return;
  }

  audioAnalysis = analysis;
  if(WRITE_ANALYSIS) writeAnalysis(analysis, trackName);

  for(var i=0; i<audioAnalysis.segments.length; i++) {
    if(audioAnalysis.segments[i].loudness_max>loudest) loudest = audioAnalysis.segments[i].loudness_max;
    if(audioAnalysis.segments[i].loudness_max<quietest) quietest = audioAnalysis.segments[i].loudness_max;
  }
  queryCurrentTrack(user);
}

function writeAnalysis(analysis, trackName) {
  var file = __dirname + '/../analysis/' + trackName + '.json';
  fs.writeFile(file, JSON.stringify(analysis), function(err) {
    if(err) console.log(err);
  }); 
}

var albumColours = [];
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
  brightness = MIN_BRIGHTNESS + brightness * (MAX_BRIGHTNESS - MIN_BRIGHTNESS) / 100;

  const brightnessDiff = Math.abs(brightness-lastBrightness);
  if(brightnessDiff>=BEAT_THRESHOLD * (MAX_BRIGHTNESS - MIN_BRIGHTNESS) / 100) {
    switch(COLOUR_MODE) {
      case 1:
        setColourFromWheel(brightness);  
        break;
      case 2:
        setColourFromAlbum(brightness)
        break;
      case 3: 
        setColourFromBrightness(brightness);
        break;
      case 4:
        setColourFromBrightnessPure(brightness);      
    }

    lastBrightness = brightness;         
  }

  beatNum++;
  if(beatNum<audioAnalysis.segments.length) beatTimer.setTimeout(() => handleBeat(), '', audioAnalysis.segments[beatNum].duration + 's');
}

function setColourFromWheel(brightness) {
  curColour+=50;

  lights.forEach(function(light) {
    light.color(curColour%360, 100, brightness, 9000, lerp);        
  });
}

function setColourFromAlbum(brightness) {
  curColour = randColourIndex();
  const col = albumColours[curColour];

  lights.forEach(function(light) {
    light.color(col[0], col[1], brightness, 9000, lerp);            
  });
}

function setColourFromBrightness(brightness) {
  if(initialSat!==-1) {
    const prevSat = curSat;
    while(prevSat===curSat) setRandSat();
  }

  lights.forEach(function(light) {
    light.getState(function(err, data) {
      if(data) {
        if(initialSat===-1 && data.color.saturation) {
          initialSat = data.color.saturation;
          curSat = initialSat;
        }
        curSat = (1- (MIN_SATURATION / 100)) * curSat + MIN_SATURATION;

        if(initialColor===-1) initialColor = data.color.hue;

        epsilon = _.random(-COLOUR_RANGE / 2, COLOUR_RANGE / 2) + 360;
        light.color((initialColor+epsilon)%360 , curSat, brightness, data.color.kelvin, lerp); 
      }           
    });
  });
}

function setRandSat() {
  curSat = _.random(initialSat-50, initialSat+50);   
  curSat = _.clamp(curSat, initialSat/2, 100);
}

function setColourFromBrightnessPure(brightness) {
  lights.forEach(function(light) {
    light.getState(function(err, data) {
      if(data) {
        light.color(data.color.hue, data.color.saturation, brightness, data.color.kelvin, lerp); 
      }           
    });
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
  if(!audioAnalysis || !audioAnalysis.segments) {
    beatTimer.clearTimeout();
    return;
  }

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
  return BEAT_MODE==1 ? getBrightnessSectionLoudness() : getBrightnessPrevBeat();
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

  const prevBeat = audioAnalysis.segments[beatNum-1];
  const curBeat = audioAnalysis.segments[beatNum];

  if(curBeat.start - prevBeat.start < lerp/2000) return lastBrightness;

  const prevBeatLoudness = prevBeat.loudness_max;
  const curBeatLoudness = curBeat.loudness_max;

  const brightness = Math.floor(Math.abs((curBeatLoudness/prevBeatLoudness)*100));
  return _.clamp(brightness, 0, 100);
}