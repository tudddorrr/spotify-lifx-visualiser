const request = require('request');
const lightService = require('./lights');

var track;

module.exports.getCurrentTrack = function(user, callback) {
  const options = {
    url: 'https://api.spotify.com/v1/me/player/currently-playing',
    headers: { 'Authorization': 'Bearer ' + user.access_token },
    json: true
  };

  let self = this;
  request.get(options, function(error, response, body) {
    if(error || !body || !body.item) {
      callback()
      return;
    }

    if(track!==body.item.id) {
      console.log("New track: " + body.item.name + " by " + body.item.artists[0].name);
      track = body.item.id;
      self.getAudioAnalysis(null, body, user);
    } else {
      if(callback) callback(null, body, user);      
    }
  });
}

module.exports.getAudioAnalysis = function(err, body, user) {
  if(err) {
    console.log(err);
    return;
  }

  const options = {
    url: 'https://api.spotify.com/v1/audio-analysis/' + body.item.id,
    headers: { 'Authorization': 'Bearer ' + user.access_token },
    json: true
  };

  request.get(options, function(error, response, body) {
    lightService.initBeat(body, user);
  });
}