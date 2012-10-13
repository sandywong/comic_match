var TURN_TIMEOUT = 30;
var transmission_errors = 0;

function longPoll(data){
  if(transmission_errors > 2){
    return;
  }

  if(data && data.messages){
    for(var i = 0; i < data.messages.length; i++){
      var message = data.messages[i];

      if(message.timestamp > CONFIG.last_message_time){
        CONFIG.last_message_time = message.timestamp;
      }

      if(message.type == "start"){
        handleStartMsg(message);
      }
      else if(message.type == "over"){
        handleOverMsg(message);
      }
      else{
        handleCurNum(message);
      }
    }
  }

  $.ajax({ cache: false
         , type: "GET"
         , url: "/getHallMsg"
         , dataType: "json"
         , data: { since: CONFIG.last_message_time }
         , error: function(){
             transmission_errors++;
             setTimeout(longPoll, 10*1000);
           }
         , success: function(data){
             transmission_errors = 0;
             longPoll(data);
           }
         });
}

function handleStartMsg(message){
  $('#roomState' + message.roomId).text("游戏中");
  $('#room' + message.roomId).removeClass('enableRoom');
  $('#curNum' + message.roomId).text("");
}

function handleOverMsg(message){
  $('#roomState' + message.roomId).text("等待中");
  $('#room' + message.roomId).addClass('enableRoom');
  handleCurNum(message);
}

function handleCurNum(message){
  var curNum = parseInt(message.info.curNum);
  if(curNum < CONFIG.SITE_NUM){
    $('#curNum' + message.roomId).text("还缺" + (CONFIG.SITE_NUM-curNum) + "人，");
  }
  else{
    $('#curNum' + message.roomId).text("满座，");
  }
}

function enterRoom(room){
  var roomId = room.id.match(/\d+/g)[0];
  $.ajax({ cache: false
         , type: "GET"
         , url: "/getRoomState"
         , dataType: "json"
         , data: { roomId: roomId }
         , error: function(){
             transmission_errors++;
             setTimeout(function(){ enterRoom(room); }, 10*1000);
           }
         , success: function(data){
             transmission_errors = 0;
             if(data.roomState == "waiting"){
               location.href = '/room/' + roomId;
             }
             else{
               var temp = confirm("此房间已经开始游戏。。。\n是否去围观？");
               if(temp == true){
                 location.href = '/room/' + roomId;
               }
             }
           }
         });
}

$(document).ready(function(){
  longPoll();
  $('.room').bind('click', function(){
    enterRoom(this);
  });
  $('.room').addClass('enableRoom');
});
