var http      = require('http');
var _         = require('lodash');
var cheerio   = require('cheerio');
var rtmpdump  = require('rtmpdump');

var BASE_URL = 'http://www.arte.tv';

function getPage(url, callback) {
  var req = http.get(url, function(res) {
    if(res.statusCode !== 200) {
      return callback(new Error('Request failed (' + res.statusCode + ')'));
    }

    var chunks = [];
    res.on('data', function(chunk) {
      chunks.push(chunk);
    });

    res.on('end', function() {
      var body = Buffer.concat(chunks).toString();
      callback(null, body);
    });  

  });

  req.on('error', callback);
  req.end();
}

function getJson(url, callback) {
  getPage(url, function(err, body) {
    if(err) return callback(err);

    try {
      var json = JSON.parse(body);
    } catch(err) {
      return callback(err);
    }
    callback(null, json);
  });
}

function getVideos(lang, callback) {
  if(_.isFunction(lang)) {
    callback = lang;
    lang = 'fr';
  }

  if(['fr','de'].indexOf(lang) === -1) {
    return callback(new Error('lang must be either "fr" or "de"'));
  }

  var url = BASE_URL + '/guide/' + lang + '/plus7.json?page=1&per_page=500';

  getJson(url, function(err, json) {
    if(err) return callback(err);

    var videos = json.videos.map(function(video) {
      return {
        image: video.image_url,
        title: video.title,
        desc: video.desc,
        duration: video.duration * 60,
        url: BASE_URL + video.url,
        views: Number(video.video_views.replace(/[^0-9]/g, '')),
        channels: video.video_channels.split(', '),
        airdate: video.airdate_long.replace(/\s+/g, ' '),
        until: video.video_rights_until
      };
    });

    callback(null, videos);
  });

}

function getVideo(url, lang, callback) {
  if(_.isFunction(lang)) {
    callback = lang;
    lang = 'fr';
  }

  getPage(url, function(err, body) {
    if(err) return callback(err);

    var $ = cheerio.load(body);
    var infosUrl = $('.video-container').attr('arte_vp_url');

    getJson(infosUrl, function(err, json) {
      if(err) return callback(err);

      var tmp = json.videoJsonPlayer;

      var info = {
        //date: new Date(tmp.lastModified), // fails parsing sometimes
        date: tmp.lastModified,
        duration: tmp.videoDurationSeconds,
        image: tmp.programImage,
        live: tmp.isLive,
        genre: tmp.genreProgram,
        title: tmp.VTI,
        desc: tmp.VDE
      };

      versions = {
        'fr': ['VF', 'VOF', 'VO-STF', 'VF-STF', 'VO'],
        'de': ['VA', 'VOA', 'VO-STA', 'VA-STA', 'VO']
      };

      var streams = _(tmp.VSR)
        .filter(function(stream) {
          return versions[lang].indexOf(stream.versionCode) !== -1
        })
        .map(function(stream) {
          stream.precedence = versions[lang].indexOf(stream.versionCode);
          return stream;
        })
        .sortBy('precedence')
        .map(function(stream) {
          delete stream.precedence;
          return stream;
        })
        .sortBy('bitrate')
        .reverse()
        .map(function(stream) {
          var tmp = {
            quality: stream.quality.split(' ').pop(),
            width: stream.width,
            height: stream.height,
            type: stream.mediaType,
            mime: stream.mimeType,
            bitrate: stream.bitrate,
            format: stream.videoFormat,
            version: stream.versionShortLibelle
          }

          if(stream.mediaType === 'rtmp') {
            _.extend(tmp, {
              rtmp: stream.streamer,
              playpath: stream.url
            });
          } else if(stream.mediaType === '' && stream.videoFormat === 'REACH') {
            _.extend(tmp, {
              type: 'http',
              mime: 'video/mp4',
              url: stream.url
            });
          } else if(stream.mediaType === 'hls') {
            _.extend(tmp, {
              url: stream.url
            });
          }

          return tmp;
        })
        .valueOf();

        info.streams = streams;

      callback(null, info);
    });

  });

}

function createStream(stream) {
  return rtmpdump.createStream({
    flashVer: 'WIN 12,0,0,44',
    swfVfy: 'http://www.arte.tv/arte_vp/jwplayer6/mediaplayer.6.6.swf',
    pageUrl: 'http://www.arte.tv/player/v2/index.php',
    rtmp: stream.rtmp,
    playpath: 'mp4:' + stream.playpath,
  });
}

module.exports.getVideos = getVideos;
module.exports.getVideo = getVideo;
module.exports.createStream = createStream;
