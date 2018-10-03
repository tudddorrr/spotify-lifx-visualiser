# Spotify LIFX Visualiser
Visualise your Spotify music through your LIFX bulb(s)!

## Setup
Clone the repository, [register a Spotify app](https://developer.spotify.com) and create a file called ".env" with the following:

```
CLIENT_ID=yourclientid
CLIENT_SECRET=yourclientsecret
REDIRECT_URI=yourredirecturi
PORT=anyport
```

You can create a redirect URI by clicking "Edit settings" on the [Spotify developer site](https://developer.spotify.com). Make sure port of the redirect URI and the port the app runs on are the same (e.g. 8888)

<img src="https://i.imgur.com/u3rQeyc.png" width="700">

Finally, run ```npm install```

## Running
```npm start```

A browser window will open asking you to authorize your Spotify account

## Additional options
```-b [mode] or --beatmode [mode]``` 

``` 
Modes: 
1: Based on the loudness of the track's current section
2: Based on the difference in loudness from the previous beat to the current beat
```

```-c [mode] or --colourmode [mode]```

```
Modes:
1: Cycles through the colour wheel
2: Based off the album artwork's colours
3: Based on the existing colour of the light with slight saturation shifts for variety
4: Purely based on the existing colour of the light
```

```-w or --writeanalysis``` writes the Spotify song analysis data to a file

```-l [lightnames] or --lights [lightnames]``` choose which lights get used separated by commas e.g. ```--lights 'Bedroom, Upstairs, Downstairs'``` (not specifying this will just assume you want to use all your lights)

```-t or --threshold``` number between 0 and 100 controlling what is deemed as a new beat (to change colour) (0 = all beats are new, 100 = barely any beats are new)

```-m [brightness] or --maxbrightness [brightness]``` sets the maximum brightness of the light (**TODO**)

### Example
```npm start -- --beatmode 2 --colourmode 1 --writeanalysis --lights 'Bedroom, Upstairs'``` will start the app in beat mode 2, colour mode 1, will write song analysis data to a file and will use the Bedroom and Upstairs lights

## Warning
Depending on the music you use it may be possible to cause seizures. Be careful!

## Built with
Node, Express, Pug, Request, [Node-LIFX](https://github.com/MariusRumpf/node-lifx), [Nanotimer](https://github.com/Krb686/nanotimer)
