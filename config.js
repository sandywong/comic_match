var mongo = require('mongoskin');

exports.port = 8080;
exports.author = 'Sandy Wong';
exports.weibo= 'http://weibo.com/sandyisswallow';
exports.site_name = 'COMIC MATCH';
exports.site_desc = '';
exports.session_secret = 'sessionsecret';

exports.db = mongo.db('localhost:27017/comicMatch');
