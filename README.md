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

## Built with
Node, Express, Pug, Request, [Node-LIFX](https://github.com/MariusRumpf/node-lifx), [Nanotimer](https://github.com/Krb686/nanotimer)