//constant variables
var SELF_NUM = 4;
var SIDE_NUM = 7;
var SITE_NUM = 4;
var PICTRUE_NUM = 9;
var TURN_TIMEOUT = 30 * 1000;
var LOOK_CARD_TIME = 5 * 1000;
var ROOM_NUM = 40;
var WIN_SCORE = 10;
//room variables
var isGameStart = {};
var startTime = {};
var poolCards = {};
var personalCards = {};
var isPoolCardsOpen = {};
var isPersonalCardsOpen = {};
var curCellI = {};
var curCellJ = {};
var timer = {};
var turn = {};
var isReady = {};
var curNum = {};
//init room variables
for(var roomId = 0; roomId < ROOM_NUM; roomId++){
  isGameStart[roomId] = false;
  startTime[roomId] = 0;
  poolCards[roomId] = {};
  personalCards[roomId] = {};
  isPoolCardsOpen[roomId] = {};
  isPersonalCardsOpen[roomId] = {};
  curCellI[roomId] = -1;
  curCellJ[roomId] = -1;
  timer[roomId] = null;
  turn[roomId] = -1;
  isReady[roomId] = {};
  for(var i = 0; i < SITE_NUM; i++){
    isReady[roomId][i] = false;
  }
  curNum[roomId] = 0;
}
var sessionMgr = require('../controllers/session.js');
var messageMgr = require('../controllers/message.js');
var hallMsgMgr = require('../controllers/hallMessage.js');
var userDb = require('../controllers/db.js');
exports.renderIndex = function(req, res, next){
  var user = req.session.oauthUser || {};
  res.render('index', { user: user });
};
exports.renderRoom = function(req, res, next){
  var user = req.session.oauthUser || {};
  if(!req.params.roomId){
    res.render('error', { user:user, message: "必须输入房间编号" });
    return;
  }
  var roomId = parseInt(req.params.roomId);
  if(isNaN(roomId) || roomId < 0 || roomId >= ROOM_NUM){
    res.render('error', { user:user, message: "非法的房间编号！" });
    return;
  }
  var userId = user.id;
  if(isGameStart[roomId] == false){
    res.render('room', { user: user
                       , selfNum: SELF_NUM
                       , sideNum: SIDE_NUM
                       , isGameStart: isGameStart[roomId]
                       , roomId: roomId
                       , id: userId
                       , startTime: startTime[roomId]
              });
  }
  else{
    var sessions = [];
    for(var i = 0; i < SITE_NUM; i++){
      var temp = sessionMgr.getSession(roomId, i);
      sessions.push(temp);
    }
    res.render('room', { user: user
                       , selfNum: SELF_NUM
                       , sideNum: SIDE_NUM
                       , isGameStart: isGameStart[roomId]
                       , roomId: roomId
                       , id: userId
                       , startTime: (new Date()).getTime()
                       , isPoolCardsOpen: isPoolCardsOpen[roomId]
                       , isPersonalCardsOpen: isPersonalCardsOpen[roomId]
                       , poolCards: poolCards[roomId]
                       , personalCards: personalCards[roomId]
                       , sessions: sessions
              });
  }
};
exports.addJoinMessage = function(req, res, next){
  if(!req.body.roomId){
    sendJSON(400, { error: "Must supply roomId parameter" }, res);
    return;
  }
  var roomId = parseInt(req.body.roomId);
  if(isNaN(roomId) || roomId < 0 || roomId >= ROOM_NUM){
    sendJSON(400, { error: "wrong format of parameter roomId" }, res);
    return;
  }
  var user = req.session.oauthUser;
  var site = -1;
  if(isGameStart[roomId] == false){
    site = findNextEmptySite(roomId);
  }
  else{
    site = -1;
  }
  var session = null;
  if(site != -1){
    session = sessionMgr.createSession(roomId, user, site);
    curNum[roomId]++;
    hallMsgMgr.appendMessage(roomId, "update", { curNum: curNum[roomId] });
  }
  else{
    session = sessionMgr.createSession(roomId, user, SITE_NUM);
    site = SITE_NUM;
  }
  if(!session){
    sendJSON(200, { status: "error", error: "hasEntered" }, res);
    return;
  }
  userDb.getUserInfo(user.id, function(dbUserInfo){
    var info = {
      id: user.id
    , url: user.t_url
    , image: user.profile_image_url
    , name: user.screen_name
    , location: user.location
    , win: dbUserInfo.win
    , play: dbUserInfo.play
    , part: dbUserInfo.part
    , score: dbUserInfo.score
    };
    messageMgr.appendMessage(roomId, site, "join", info);
    sendJSON(200, { status: "ok", site: site}, res);
  });
};
exports.getMessage = function(req, res, next){
  if(!req.query.roomId || !req.query.since || !req.query.site){
    sendJSON(400, { error: "Must supply roomId, since and site parameter" }, res);
    return;
  }
  var roomId = parseInt(req.query.roomId);
  if(isNaN(roomId) || roomId < 0 || roomId >= ROOM_NUM){
    sendJSON(400, { error: "wrong format of parameter roomId" }, res);
    return;
  }
  var since = parseInt(req.query.since);
  var site = req.query.site;
  var session = sessionMgr.getSession(roomId, site);
  if(session){
    session.poke();
  }
  messageMgr.query(roomId, since, function(messages){
    sendJSON(200, { messages: messages }, res);
  });
};
exports.addActionMessage = function(req, res, next){
  if(!req.body.roomId || !req.body.site || !req.body.type){
    sendJSON(400, { error: "Must supply roomId, site and type parameter" }, res);
    return;
  }
  var roomId = parseInt(req.body.roomId);
  if(isNaN(roomId) || roomId < 0 || roomId >= ROOM_NUM){
    sendJSON(400, { error: "wrong format of parameter roomId" }, res);
    return;
  }
  var site = req.body.site;
  var session = sessionMgr.getSession(roomId, site);
  if(session){
    session.poke();
  }
  var type = req.body.type;
  if(site != turn[roomId]){
    sendJSON(400, { error: "wrong site" }, res);
    return;
  }
  if(type == "pool"){
    var i = req.body.i, j = req.body.j;
    if(!i || !j){
      sendJSON(400, { error: "Must supply i and j parameter" }, res);
      return;
    }
    if(i < 0 || req.query.i >= SIDE_NUM){
      sendJSON(400, { error: "wrong parameter i" }, res);
      return;
    }
    if(j < 0 || j >= SIDE_NUM){
      sendJSON(400, { error: "wrong parameter j" }, res);
      return;
    }
    if(isPoolCardsOpen[roomId][i][j] == false){
      isPoolCardsOpen[roomId][i][j] = true;
      var info = { 
        type: "pool"
        , kind: poolCards[roomId][i][j]
        , i: i
        , j: j
      };
      messageMgr.appendMessage(roomId, site, "action", info);
      sendJSON(200, { status: "ok" }, res);
      curCellI[roomId] = i;
      curCellJ[roomId] = j;
    }
    return;
  }
  if(type == "pocket"){
    var i = req.body.i, j = req.body.j;
    if(i < 0 || req.query.i >= SELF_NUM){
      sendJSON(400, { error: "wrong parameter i" }, res);
      return;
    }
    if(isPersonalCardsOpen[roomId][site][i] == false){
      isPersonalCardsOpen[roomId][site][i] = true;
      var info = { 
        type: "pocket"
      , kind: personalCards[roomId][site][i]
      , i: i
      };
      var pushMessages = [];
      pushMessages.push({ site: site, type: "action", info: info });
      if(personalCards[roomId][site][i] != poolCards[roomId][curCellI[roomId]][curCellJ[roomId]]){
        isPoolCardsOpen[roomId][curCellI[roomId]][curCellJ[roomId]] = false;
        isPersonalCardsOpen[roomId][site][i] = false;
        var info = {
          type: "wrongKind"
        , i: curCellI[roomId]
        , j: curCellJ[roomId]
        , card: i
        };
        pushMessages.push({ site: site, type: "action", info: info });
        var nextSite = findNextSite(roomId, site);
        if(nextSite != -1){
          pushMessages = addTurnMsg(roomId, nextSite, pushMessages);
          messageMgr.appendMessages(roomId, pushMessages);
        }
        else{
          gameOver(roomId);
          messageMgr.clear(roomId);
        }
      }
      else{
        var hasWon = true;
        for(var count = 0; count < SELF_NUM; count++){
          if(isPersonalCardsOpen[roomId][site][count] == false){
            hasWon = false;
            break;
          }
        }
        if(hasWon == true){
          pushMessages.push({ site: site, type: "win", info: { name: session.name } });
          messageMgr.appendMessages(roomId, pushMessages);
          startTime[roomId] = (new Date()).getTime();
          userDb.increaseWin(session.id);
          userDb.addScore(session.id, WIN_SCORE);
          gameOver(roomId);
          return;
        }
        var nextSite = findNextSite(roomId, site);
        if(nextSite != -1){
          pushMessages = addTurnMsg(roomId, nextSite, pushMessages);
          messageMgr.appendMessages(roomId, pushMessages);
        }
        else{
          gameOver(roomId);
          messageMgr.clear(roomId);
        }
      }
      sendJSON(200, { status: "ok" }, res);
    }
    return;
  }
};
exports.addPartMessage = function(req, res, next){
  if(!req.body.roomId || !req.body.site){
    sendJSON(400, { error: "Must supply roomId and site parameter" }, res);
    return;
  }
  var roomId = parseInt(req.body.roomId);
  if(isNaN(roomId) || roomId < 0 || roomId >= ROOM_NUM){
    sendJSON(400, { error: "wrong format of parameter roomId" }, res);
    return;
  }
  var site = req.body.site;
  var session = sessionMgr.getSession(roomId, site);
  if(session){
    session.destroy();
  }
  if(site >= 0 && site < SITE_NUM){
    isReady[roomId][site] = false;
  }
  sendJSON(200, {}, res);
};
exports.renderHall = function(req, res, next){
  var user = req.session.oauthUser || {};
  res.render('hall', { user: user, isGameStart: isGameStart, curNum: curNum, timestamp: (new Date()).getTime() });
};
exports.getHallMessage = function(req, res, next){
  if(!req.query.since){
    sendJSON(400, { error: "Must supply since parameter" }, res);
    return;
  }
  var since = req.query.since;
  hallMsgMgr.query(since, function(messages){
    sendJSON(200, { messages: messages }, res);
  });
};
exports.getRoomState = function(req, res, next){
  if(!req.query.roomId){
    sendJSON(400, { error: "Must supply roomId parameter" }, res);
    return;
  }
  var roomId = parseInt(req.query.roomId);
  if(isNaN(roomId) || roomId < 0 || roomId >= ROOM_NUM){
    sendJSON(400, { error: "wrong format of parameter roomId" }, res);
    return;
  }
  roomState = isGameStart[roomId]? "gaming" : "waiting";
  sendJSON(200, { roomState: roomState}, res);
};
exports.addReadyMessage = function(req, res, next){
  if(!req.body.roomId || !req.body.site){
    sendJSON(400, { error: "Must supply roomId and site parameter" }, res);
    return;
  }
  var roomId = parseInt(req.body.roomId);
  if(isNaN(roomId) || roomId < 0 || roomId >= ROOM_NUM){
    sendJSON(400, { error: "wrong format of parameter roomId" }, res);
    return;
  }
  var site = parseInt(req.body.site);
  if(isNaN(site) || site < 0 || site >= SITE_NUM){
    sendJSON(400, { error: "wrong format of parameter site" }, res);
    return;
  }
  var session = sessionMgr.getSession(roomId, site);
  if(session){
    session.poke();
  }
  isReady[roomId][site] = true;
  var pushMessages = [];
  pushMessages.push({ site: site, type: "ready", info: null });
  var isStart = true;
  for(var i = 0; i < SITE_NUM; i++){
    if(isReady[roomId][i] == false){
      isStart = false;
      break;
    }
  }
  if(isStart == true && isGameStart[roomId] == false){
    pushMessages = gameStart(roomId, pushMessages);
    var temp = addTurnMsg(roomId, 0, []);
    setTimeout(function(){
      messageMgr.appendMessages(roomId, temp);
    }, LOOK_CARD_TIME);
    /*
    for(var i in poolCards[roomId]){
      console.log(poolCards[roomId][i]);
    }
    for(var i in personalCards[roomId][0]){
      console.log(personalCards[roomId][0][i]);
    }
    */
  }
  messageMgr.appendMessages(roomId, pushMessages);
  sendJSON(200, { status: "ok" }, res);
};
exports.addCancelReadyMessage = function(req, res, next){
   if(!req.body.roomId || !req.body.site){
    sendJSON(400, { error: "Must supply roomId and site parameter" }, res);
    return;
  }
  var roomId = parseInt(req.body.roomId);
  if(isNaN(roomId) || roomId < 0 || roomId >= ROOM_NUM){
    sendJSON(400, { error: "wrong format of parameter roomId" }, res);
    return;
  }
  var site = parseInt(req.body.site);
  if(isNaN(site) || site < 0 || site >= SITE_NUM){
    sendJSON(400, { error: "wrong format of parameter site" }, res);
    return;
  }
  var session = sessionMgr.getSession(roomId, site);
  if(session){
    session.poke();
  }
  isReady[roomId][site] = false;
  messageMgr.appendMessage(roomId, site, "cancelReady", null);
  sendJSON(200, { status: "ok" }, res);
};
function gameStart(roomId, pushMessages){
  //init poolCards
  for(var i = 0; i < SIDE_NUM; i++){
    poolCards[roomId][i] = {};
    isPoolCardsOpen[roomId][i] = {};
    for(var j = 0; j < SIDE_NUM; j++){
      poolCards[roomId][i][j] = Math.floor(Math.random() * PICTRUE_NUM);
      isPoolCardsOpen[roomId][i][j] = false;
    }
  }
  //init personalCards
  for(var i = 0; i < SITE_NUM; i++){
    personalCards[roomId][i] = {};
    isPersonalCardsOpen[roomId][i] = {};
    for(var j = 0; j < SELF_NUM; j++){
      personalCards[roomId][i][j] = Math.floor(Math.random() * PICTRUE_NUM);
      isPersonalCardsOpen[roomId][i][j] = false;
    }
  }
  //add play number by userId
  for(var i = 0; i < SITE_NUM; i++){
    var session = sessionMgr.getSession(roomId, i);
    if(session != null){
      userDb.increasePlay(session.id);
    }
  }
  //add gameStart message
  pushMessages.push({ site: -1, type: "gameStart", info: { cards: personalCards[roomId] } });
  hallMsgMgr.appendMessage(roomId, "start", null);
  isGameStart[roomId] = true;
  return pushMessages;
}
function gameOver(roomId){
  isGameStart[roomId] = false;
  for(var i = 0; i < SITE_NUM; i++){
    isReady[roomId][i] = false;
  }
  clearTimeout(timer[roomId]);
  timer[roomId] = null;
  hallMsgMgr.appendMessage(roomId, "over", { curNum:curNum[roomId] });
}
function sendJSON(code, obj, res){
  var body = new Buffer(JSON.stringify(obj));
  res.writeHead(code, { "Content-Type": "text/json"
                      , "Content-Length": body.length
                      });
  res.end(body);
}
function addTurnMsg(roomId, site, pushMessages){
  if(timer[roomId] != null){
    clearTimeout(timer[roomId]);
  }
  turn[roomId] = site;
  curCellI[roomId] = -1;
  curCellJ[roomId] = -1;
  //wait a mileseconds in case of webside cannot get this message
  pushMessages.push({ site: site, type: "turn", info: null });
  timer[roomId] = setTimeout(function(){
    var info = {};
    if(curCellI[roomId] != -1 && curCellJ[roomId] != -1){
      isPoolCardsOpen[roomId][curCellI[roomId]][curCellJ[roomId]] = false;
      info = {
        type: "timeout"
        , i: curCellI[roomId]
        , j: curCellJ[roomId]
        , enablePocket: true
      };
    }
    else{
      info = {
        type: "timeout"
        , enablePocket: false
      };
    }
    var temp = [];
    temp.push({site: turn[roomId], type: "action", info: info});
    var nextSite = findNextSite(roomId, turn[roomId]);
    if(nextSite != -1){
      temp = addTurnMsg(roomId, nextSite, temp);
      messageMgr.appendMessages(roomId, temp);
    }
    else{
      gameOver(roomId);
      messageMgr.clear(roomId);
    }
  }, TURN_TIMEOUT);
  return pushMessages;
}
function findNextSite(roomId, site){
  while(sessionMgr.getSession(roomId, (++site)%SITE_NUM) == null){
    if(site >= SITE_NUM * 2 - 1){
      return -1;
    }
  }
  return site%SITE_NUM;
}
function findNextEmptySite(roomId){
  var site = 0;
  while(sessionMgr.getSession(roomId, site%SITE_NUM)){
    site++;
    if(site >= SITE_NUM){
      return -1;
    }
  }
  return site;
}
exports.partUpdateNum = function(roomId, site, id){
  if(site >= 0 && site < SITE_NUM){
    curNum[roomId]--;
    if(isGameStart[roomId] == false){
      hallMsgMgr.appendMessage(roomId, "update", { curNum: curNum[roomId] });
    }
    else{
      if(id){
        userDb.increasePart(id);
      }
    }
  }
};
exports.partWhenTurn = function(roomId, site, partMessage){
  if(turn[roomId] == site){
    var nextSite = findNextSite(roomId, site);
    if(nextSite != -1){
      var temp = addTurnMsg(roomId, nextSite, partMessage);
      messageMgr.appendMessages(roomId, temp);
      return true;
    }
    else{
      gameOver(roomId);
      messageMgr.clear(roomId);
    }
  }
  return false;
};
