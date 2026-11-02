function Cu(raw, mediaId) {
  let n = '', i = '';
  
  const videoMatches = raw.match(/https:\\\/\\\/flow-content\.google\\\/video\\\/[^"\s]+|https:\/\/flow-content\.google\/video\/[^"\s]+/g);
  if (videoMatches && videoMatches.length > 0) {
    n = videoMatches[0].replace(/\\\//g, '/').replace(/\\u003d/g, '=').replace(/\\u0026/g, '&');
  }

  const imgMatches = raw.match(/https:\\\/\\\/flow-content\.google\\\/image\\\/[^"\s]+|https:\/\/flow-content\.google\/image\/[^"\s]+/g);
  if (imgMatches && imgMatches.length > 0) {
    i = imgMatches[0].replace(/\\\//g, '/').replace(/\\u003d/g, '=').replace(/\\u0026/g, '&');
  }

  return { videoUrl: n, thumbnailUrl: i || void 0, mediaId };
}

const testRaw = '[[["wrb.fr","as29s","[null,null,null,null,null,[null,null,null,null,null,null,null,null,null,null,null,\\"https:\\\\/\\\\/flow-content.google\\\\/image\\\\/abc?Expires=1793444075\\\\u0026KeyName=labs-flow-prod-cdn-key\\\\u0026Signature=sig123\\"],null,[[null,null,null,null,null,null,null,\\"cat\\",\\"https:\\\\/\\\\/flow-content.google\\\\/video\\\\/1a7501d4-ac44-408b-8c1c-70204f549c5d?Expires=1793444075\\\\u0026KeyName=labs-flow-prod-cdn-key\\\\u0026Signature=sig456\\"]]]"]]]';

const res = Cu(testRaw, '1a7501d4-ac44-408b-8c1c-70204f549c5d');
console.log('EXTRACTED VIDEO URL:', res.videoUrl);
console.log('EXTRACTED THUMB URL:', res.thumbnailUrl);
