const path = require('path');
const sample = ')]}\'\n[["wrb.fr","as29s","[null,null,null,null,null,[null,null,null,null,null,null,null,null,null,null,null,\\"https:\\/\\/flow-content.google\\/image\\/1a7501d4?Expires=1793444075\\\\u0026KeyName=labs-flow-prod-cdn-key\\\\u0026Signature=abc123xyz\\",null,null,12345],null,[[null,null,null,null,null,null,null,\\"My Video\\",\\"https:\\/\\/flow-content.google\\/video\\/1a7501d4?Expires=1793444075\\\\u0026KeyName=labs-flow-prod-cdn-key\\\\u0026Signature=def456uvw\\"],null,[null,null,[10]]]]",null,null,null,"generic"]]';

function cleanUrl(u) {
  if (typeof u !== 'string') return '';
  return u
    .replace(/\\+"/g, '')
    .replace(/\\\//g, '/')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003d/g, '=')
    .replace(/\\u002f/g, '/')
    .replace(/&amp;/g, '&');
}

// Method 2: Regex
const oldRe = /(?:https:\/\/flow-content\.google\/video\/|https:\\\/\\\/flow-content\.google\\\/video\\\/)[^"'\s\\]+/g;
console.log('Old regex match:', sample.match(oldRe));

const newRe = /(?:https:\/\/flow-content\.google\/video\/|https:\\\/\\\/flow-content\.google\\\/video\\\/)[^"'\s]+/g;
const m = sample.match(newRe);
console.log('New regex raw match:', m ? m[0] : null);
console.log('New regex cleaned:', m ? cleanUrl(m[0]) : null);
