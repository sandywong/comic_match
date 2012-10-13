var express = require('express'),
    ejs = require('ejs'),
    weibo =  require('./node_modules/weibo'),
    config = require('./config'),
    game = require('./controllers/game.js');

weibo.init('weibo', '3546274674', 'd21e644d5a036d181c274bc073e24203');

var app = express.createServer();
app.use(express.static(__dirname + '/public', {maxAge: 3600000 * 24 * 30}));
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.session({
    secret: config.session_secret
}));
app.use(weibo.oauth({
    loginPath: '/login',
    logoutPath: '/logout',
    blogtypeField: 'type',
    homeUrl: 'http://sandy.cnodejs.net',
    callbackPath: '/hall'
}));
app.helpers({
    config: config
});

/**
 * Views settings
 */
app.set("view engine", "html");
app.set("views", __dirname + '/views');
app.register("html", ejs);

/**
 * Routing
 */
var hasLogin = function(req, res, next){
  if(req.session && req.session.oauthUser){
    return next();
  }
  return res.render('error', { user: {}, message: "请先登录！" });
}
app.get('/', game.renderIndex);
app.post('/join', hasLogin, game.addJoinMessage);
app.post('/part', hasLogin, game.addPartMessage);
app.get('/hall', hasLogin, game.renderHall);
app.get('/getHallMsg', hasLogin, game.getHallMessage);
app.get('/getRoomState', hasLogin, game.getRoomState);
app.get('/room/:roomId', hasLogin, game.renderRoom);
app.get('/getMsg', hasLogin, game.getMessage);
app.post('/addActionMsg', hasLogin, game.addActionMessage);
app.post('/ready', hasLogin, game.addReadyMessage);
app.post('/cancelReady', hasLogin, game.addCancelReadyMessage);

app.listen(config.port);
console.log('Server start http://localhost:' + config.port);

