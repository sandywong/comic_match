var MESSAGE_MAX_NUM = 200;
var CALLBACK_TIMEOUT = 20 * 1000;
var ROOM_NUM = 40;

var messages = {};
var callbacks = {};
for(var room = 0; room < ROOM_NUM; room++){
  messages[room] = [];
  callbacks[room] = [];
}

exports.appendMessage = function(roomId, site, type, info){
  var pushMessages = [];
  var m = {
    site: site,
    type: type,//turn,action,part,join,gameStart,win,ready,cancelReady
    timestamp: (new Date()).getTime(),
    info: info
  };

  switch(type){
    case "join":
      console.log(m.site+" join");
      break;
    case "turn":
      console.log(m.site+"\'s turn");
      break;
    case "action":
      console.log(m.site+"\'s action: " + m.info.type);
      break;
    case "part":
      var game = require('../controllers/game.js');
      game.partUpdateNum(roomId, site, info.id);
      if(game.partWhenTurn(roomId, site, [m]) == true){
        return;
      }
      break;
    case "gameStart":
      console.log("gameStart");
      break;
    case "win":
      console.log(m.site+" win");
      break;
    case "ready":
      console.log(m.site+" ready");
      break;
    case "cancelReady":
      console.log(m.site+" cancelReady");
      break;
    default:
      return;
      break;
  }

  messages[roomId].push(m);

  while(callbacks[roomId].length > 0){
    callbacks[roomId].shift().callback([m]);
  }

  while(messages[roomId].length > MESSAGE_MAX_NUM){
    messages[roomId].shift();
  }
};

exports.appendMessages = function(roomId, newMessages){
  var pushMessages = [];
  for(var i in newMessages){
    var m = {
      site: newMessages[i].site,
      type: newMessages[i].type,//turn,action,part,join,gameStart,win,ready,cancelReady
      timestamp: (new Date()).getTime(),
      info: newMessages[i].info
    };

    switch(newMessages[i].type){
      case "join":
        console.log(m.site+" join");
        break;
      case "turn":
        console.log(m.site+"\'s turn");
        break;
      case "action":
        console.log(m.site+"\'s action: " + m.info.type);
        break;
      case "part":
        console.log(m.site+" part");
        break;
      case "gameStart":
        console.log("gameStart");
        break;
      case "win":
        console.log(m.site+" win");
        break;
      case "ready":
        console.log(m.site+" ready");
        break;
      case "cancelReady":
        console.log(m.site+" cancelReady");
        break;
      default:
        return;
        break;
    }

    messages[roomId].push(m);
    pushMessages.push(m);
  }

  while(callbacks[roomId].length > 0){
    callbacks[roomId].shift().callback(pushMessages);
  }

  while(messages[roomId].length > MESSAGE_MAX_NUM){
    messages[roomId].shift();
  }
};

exports.query = function(roomId, since, callback){
  var matching = [];
  for(var i = 0; i < messages[roomId].length; i++){
    var message = messages[roomId][i];
    if(message.timestamp > since){
      matching.push(message);
    }
  }

  if(matching.length != 0){
    callback(matching);
  }
  else{
    callbacks[roomId].push({  timestamp: new Date(), callback: callback });
  }
};

exports.clear = function(roomId){
  messages[roomId] = [];
}

//clear old callbacks every 3 seconds
//they can hang around for at most 30 seconds
setInterval(function (){
  var now = new Date();
  for(var room = 0; room < ROOM_NUM; room++){
    while (callbacks[room].length > 0 && now - callbacks[room][0].timestamp > CALLBACK_TIMEOUT) {
      callbacks[room].shift().callback([]);
    }
  }
}, 3000);

