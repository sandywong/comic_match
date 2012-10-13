var MESSAGE_MAX_NUM = 200;
var CALLBACK_TIMEOUT = 30 * 1000;

var messages = this.messages = [];
var callbacks = [];

exports.appendMessage = function(roomId, type, info){
  var m = {
    roomId: roomId,
    type: type, //start, over
    timestamp: (new Date()).getTime(),
    info: info
  };

  switch(type){
    case "start":
      console.log(m.roomId+" start");
      break;
    case "over":
      console.log(m.roomId+" over");
      break;
    case "update":
      console.log(m.roomId+" update " + info.curNum);
      break;
    default:
      return;
      break;
  }

  messages.push(m);

  while(callbacks.length > 0){
    callbacks.shift().callback([m]);
  }

  while(messages.length > MESSAGE_MAX_NUM){
    messages.shift();
  }
};

exports.query = function(since, callback){
  var matching = [];
  for(var i = 0; i < messages.length; i++){
    var message = messages[i];
    if(message.timestamp > since){
      matching.push(message);
    }
  }

  if(matching.length != 0){
    callback(matching);
  }
  else{
    callbacks.push({  timestamp: new Date(), callback: callback });
  }
};

//clear old callbacks every 3 seconds
//they can hang around for at most 30 seconds
setInterval(function (){
  var now = new Date();
  while (callbacks.length > 0 && now - callbacks[0].timestamp > CALLBACK_TIMEOUT) {
    callbacks.shift().callback([]);
  }
}, 3000);

