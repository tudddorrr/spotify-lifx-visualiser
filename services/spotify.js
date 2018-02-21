const url = 'https://api.spotify.com/v1/';
const request = require('request');
const lightService = require('./lights');
const colourService = require('./colours');

var track;

module.exports.getCurrentTrack = function(user, callback) {
  const options = {
    url: url + 'me/player/currently-playing',
    headers: { 'Authorization': 'Bearer ' + user.access_token },
    json: true
  };

  let self = this;
  request.get(options, function(err, response, body) {
    if(err || !body || !body.item) {
      if(callback) callback(err || "Couldn't get current track");
      return;
    }

    if(track!==body.item.id) {
      console.log("New track: " + body.item.name + " by " + body.item.artists[0].name);
      track = body.item.id;
      self.getAudioAnalysis(null, body, user, body.item.name);
      self.getAlbumColours(body, user);
    } else {
      if(callback) callback(null, body, user);      
    }
  });
}

module.exports.getAudioAnalysis = function(err, body, user, trackName) {
  if(err) {
    console.log(err);
    return;
  }

  const options = {
    url: url + 'audio-analysis/' + body.item.id,
    headers: { 'Authorization': 'Bearer ' + user.access_token },
    json: true
  };

  request.get(options, function(err, response, body) {
    lightService.initBeat(body, user, trackName);
  });
}

module.exports.getAlbumColours = function(body, user) {
  const options = {
    url: url + 'albums/' + body.item.album.id,
    headers: { 'Authorization': 'Bearer ' + user.access_token },
    json: true
  };

  request.get(options, function(err, response, body) {
    colourService.analyse(body.images[1].url, function(err, res) {
      if(err) {
        console.log(err);
        return;
      }

      lightService.setAlbumColours(res);
    });
  });
}