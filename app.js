require('dotenv').config();

const express = require('express');
const request = require('request');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const opn = require('opn');

var user;
const stateKey = 'spotify_auth_state';
const lightService = require('./services/lights');
const spotifyService = require('./services/spotify');


function generateRandomString() {
  var text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  for(var i=0; i<16; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};

var app = express();
app.set('view engine', 'pug');
app.use(express.static(__dirname + '/public'))
   .use(cookieParser());

app.get('/login', function(req, res) {
  var state = generateRandomString();
  res.cookie(stateKey, state);

  var scope = 'user-read-private user-read-email user-read-playback-state';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: process.env.CLIENT_ID,
      scope: scope,
      redirect_uri: process.env.REDIRECT_URI,
      state: state
    }));
});

app.get('/callback', function(req, res) {
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if(state===null || state!==storedState) {
    res.redirect('/error?' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: process.env.REDIRECT_URI,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if(!error && response.statusCode===200) {
        const access_token = body.access_token;
        const refresh_token = body.refresh_token;

        const options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        request.get(options, function(error, response, body) {
          if(error) {
            res.redirect('/error?' +
            querystring.stringify({
              error: error
            }));
            return;
          }
          user = body;
          console.log(body)
          user.access_token = access_token;
          res.redirect('/user');
        });
      } else {
        res.redirect('/error?' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {
  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if(!error && response.statusCode===200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.get('/user', function(req, res) {
  if(!user) {
    res.redirect('/');
    return;
  }
  if(lightService.getLights()) {
    res.redirect('/go');
    return;
  }

  res.render('user', {
    user: user
  });
});

app.get('/go', function(req, res) {
  if(!user || !lightService.getLights()) {
    res.redirect('/');
    return;
  }

  res.render('ready', {
    user: user
  });

  spotifyService.getCurrentTrack(user);    
});

app.get('/go/colour/:chosenColor', function(req, res) {
  var colour = req.params.chosenColor;

  var lights = require('./services/lights');
  console.log('Changing color to ' + colour);
  lights.setInitialColor(colour);

  if(!user || !lightService.getLights()) {
    res.redirect('/');
    return;
  }

  res.render('ready', {
    user: user
  });

  spotifyService.getCurrentTrack(user);    
});

app.get('/go/mode/:chosenMode', function(req, res) {
  var mode = req.params.chosenMode;

  var lights = require('./services/lights');
  console.log('Changing mode to ' + mode);
  lights.setMode(mode);

  if(!user || !lightService.getLights()) {
    res.redirect('/');
    return;
  }

  res.render('ready', {
    user: user
  });

  spotifyService.getCurrentTrack(user);    
});

app.get('/error', function(req, res) {
  if(!req.query.msg) {
    res.redirect('/');
    return;
  }

  res.render('error', {
    error: req.query.msg
  });
});

const port = process.env.PORT || 8888;
console.log('Listening on ' + port);
app.listen(port);
opn('http://localhost:' + port);
