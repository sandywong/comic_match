var messageMgr = require('../controllers/message.js');

var SESSION_TIMEOUT = 30 * 1000;
var ROOM_NUM = 40;

var sessions = {};
for(var id  = 0; id < ROOM_NUM; id++){
  sessions[id] = {};
}

exports.createSession = function(roomId, userInfo, site){
  //check whether id, site is valid
  //code
  if(sessions[roomId].hasOwnProperty(site)){
    return null;
  }

  for(var room = 0; room < ROOM_NUM; room++){
    for(var i in sessions[room]){
      var session = sessions[room][i];
      if(session && session.id === userInfo.id){
        //return null;
      }
    }
  }

  var session = {
    id: userInfo.id,
    site: site,
    name: userInfo.screen_name,
    url: userInfo.t_url,
    location: userInfo.location,
    image: userInfo.profile_image_url,
    timestamp: new Date(),
    poke: function(){
      session.timestamp = new Date();
    },
    destroy: function(){
      var partId = sessions[roomId][site].id;
      delete sessions[roomId][session.site];
      messageMgr.appendMessage(roomId, site, "part", {id: partId});
    }
  };
  sessions[roomId][site] = session;
  return session;
};

exports.getSession = function(roomId, site){
  if(typeof(site) != 'undefined' && sessions[roomId][site]){
    var session = sessions[roomId][site];
    return session;
  }
  else{
    return null;
  }
}

setInterval(function(){
  var now = new Date();
  for(var room = 0; room < ROOM_NUM; room++){
    for(var site in sessions[room]){
      if(!sessions[room].hasOwnProperty(site)) continue;
      var session = sessions[room][site];

      if(now - session.timestamp > SESSION_TIMEOUT){
        session.destroy();
      }
    }
  }
}, 3000);
