arteplus7
=============
### Node client for the arte+7 website

This module provides a clean wrapper around the arte+7 website. It enables you to list available videos, fetch video metadata and 
stream media content wherever you like.

'fr' and 'de' languages supported.

Installation
------------

``` bash
$ npm install arteplus7
```

Examples
--------

List available videos
``` javascript
var arteplus7 = require('arteplus7');

arteplus7.getVideos('fr', function(err, videos) { // 'de' works too
  if(err) throw err;
  videos.forEach(function(video) {
    console.log(video.title);
  });
});
```

Fetch video metadata
``` javascript
var arteplus7 = require('arteplus7');

var url = 'http://www.arte.tv/guide/fr/044620-002/karambolage';

arteplus7.getVideo(url, function(err, video) {
  if(err) throw err;
  console.log(video);
});
```

Get a readable video stream
``` javascript
var arteplus7 = require('arteplus7');

var url = 'http://www.arte.tv/guide/fr/044620-002/karambolage';

arteplus7.getVideo(url, function(err, video) {
  if(err) throw err;
  var rtmpStreams = video.streams.filter(function(stream) {
    return stream.type === 'rtmp';
  });
  var stream = arteplus7.createStream(rtmpStreams.shift());
  // stream.pipe() wherever you want
});
```
