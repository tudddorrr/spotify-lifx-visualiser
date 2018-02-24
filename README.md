# Spotify LIFX Visualiser
Visualise your Spotify music through your LIFX bulb!

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

A browser window will open asking you to authorize your Spotify account

## Additional options
```-b [mode] or --beatmode [mode]``` 

``` 
Modes: 
0: Based on the loudness of the track's current section
1: Based on the difference in loudness from the previous beat to the current beat
```

```-c [mode] or --colourmode [mode]```

```
Modes:
0: Cycles through the colour wheel
1: Based off the album artwork's colours
2: Based on the existing colour of the light with slight saturation shifts for variety
3: Purely based on the existing colour of the light
```

```-w or --writeanalysis``` writes the Spotify song analysis data to a file

```-l [lightnames] or --lights [lightnames]``` choose which lights get used separated by commas e.g. ```--lights 'Bedroom Lights, Upstairs, Downstairs'``` (**TODO**)

```-m [brightness] or --maxbrightness [brightness]``` sets the maximum brightness of the light (**TODO**)

### Example
```node app.js -b 1 -c 0 -w``` will start the app in beat mode 0, colour mode 1 and will write song analysis data to a file

## Warning
Depending on the music you use it may be possible to cause seizures. Be careful!

## Built with
Node, Express, Pug, Request, [Node-LIFX](https://github.com/MariusRumpf/node-lifx), [Nanotimer](https://github.com/Krb686/nanotimer)