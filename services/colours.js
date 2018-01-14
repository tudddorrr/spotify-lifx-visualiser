const _ = require('lodash');

const convert = require('color-convert');
const vibrant = require('node-vibrant');

module.exports.analyse = function(url, callback) {
  vibrant.from(url).getPalette((err, palette) => {
    if(err) {
      callback(err);
      return;
    }

    const keys = _.keysIn(palette);
    var cols = [];

    for(var i=0; i<keys.length; i++) {
      if(palette[keys[i]]!==null) {
        var col = palette[keys[i]].getRgb();
        col = convert.rgb.hsv(col);
        cols.push(col);        
      } 
    } 

    return callback(null, cols);
  });
}