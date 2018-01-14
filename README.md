# Spotify LIFX Visualiser
Visualise your Spotify music through your LIFX bulb. Currently only supports one-device setups (and isn't perfect!)

## Setup
Clone the repository, [register a Spotify app](https://developer.spotify.com), create a .env file with the following:

```
CLIENT_ID=yourclientid
CLIENT_SECRET=yourclientsecret
REDIRECT_URI=yourcallbackurl
PORT=anyport
```

Finally, run ```npm install```

## Running
```npm start```

## Additional options
In ```services/lights.js``` you'll find a few more options

```BEAT_MODE``` changes the way the light reacts to different beats

```COLOUR_MODE``` changes the lights used by the visualiser to either be from the colour wheel or from the album's artwork

## Warning
Depending on the music you use it may be possible to cause seizures (especially with the album artwork colour mode). Be careful.

## Built with
Node, Express, Pug, Request, [Node-LIFX](https://github.com/MariusRumpf/node-lifx), [Nanotimer](https://github.com/Krb686/nanotimer)