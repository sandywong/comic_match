var TURN_TIMEOUT = 30;
var LOOK_CARD_TIME = 5;
var transmission_errors = 0;
var timer = null;
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
      if(CONFIG.isGameStart == true){
        handleGameMsg(message);
      }
      else{
        handleRoomMsg(message);
      }
    }
  }
  $.ajax({ cache: false
         , type: "GET"
         , url: "/getMsg"
         , dataType: "json"
         , data: { since: CONFIG.last_message_time
                 , site: CONFIG.site
                 , roomId: CONFIG.roomId
                 }
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
function handleGameMsg(message){
  switch(message.type){
    case "join":
      userJoin(message);
      break;
    case "part":
      userPart(message);
      break;
    case "turn":
      $('.curSite').removeClass('curSite');
      stopCountDown();
      var showSite = '#site' + calculateShowSite(message.site);
      $(showSite).addClass('curSite');
      startCountDown(calculateShowSite(message.site), TURN_TIMEOUT);
      if(message.site == CONFIG.site){
        enablePool();
      }
      break;
    case "win":
      alert("恭喜 " + message.info.name + " 赢了！");
      CONFIG.isGameStart = false;
      if(CONFIG.site >= 0 && CONFIG.site < CONFIG.siteNum){
        location.href = '/room/' + CONFIG.roomId;
      }
      else{
        $('#room').show();
        $('#game').hide();
      }
      break;
    case "action":
      userAction(message);
      break;
    default:
      break;
  }
}
function handleRoomMsg(message){
  switch(message.type){
    case "join":
      userJoin(message);
      break;
    case "part":
      userPart(message);
      break;
    case "ready":
      if(message.site >= 0 && message.site < CONFIG.siteNum){
        $('#ready' + message.site).show();
      }
      break;
    case "cancelReady":
      if(message.site >= 0 && message.site < CONFIG.siteNum){
        $('#ready' + message.site).hide();
      }
      break;
    case "gameStart":
      CONFIG.isGameStart = true;
      $('#room').hide();
      $('#game').show();
      var showSite = calculateShowSite(CONFIG.site);
      for(var i = 0; i < CONFIG.cardNum; i++){
        $('#card' + showSite + '_' + i).html("<img src=\"/images/" + message.info.cards[CONFIG.site][i] + ".jpg\" alt=\"" + message.info.cards[CONFIG.site][i] + "\" />");
      }
      startCountDown(showSite, LOOK_CARD_TIME);
      setTimeout(function(){
        stopCountDown();
        for(var i = 0; i < CONFIG.cardNum; i++){
          $('#card' + showSite + '_' + i).html("<img src=\"/images/default.jpg\" />");
        }
      }, LOOK_CARD_TIME * 1000);
      break;
    default:
      break;
  }
}
function flipWrongCards(ceilId, pktCardId, site){
  $(ceilId).addClass('ceil');
  if(site == CONFIG.site){
    $(pktCardId).addClass('unopenPktCard');
  }
  setTimeout(function(){
    $(ceilId).html("<img src=\"/images/default.jpg\" />");
    $(ceilId).removeClass('selectedCell');
    $(pktCardId).html("<img src=\"/images/default.jpg\" />");
    $(pktCardId).removeClass('openedPktCard');
  }, 1 * 1000);
}
function calculateShowSite(site){
  return (parseInt(site) + CONFIG.siteNum - CONFIG.site + CONFIG.mySite) % CONFIG.siteNum;
}
function enablePool(){
  $('#pool').removeClass('disablePool');
  $('#pool').addClass('enablePool');
  $('.ceil').addClass('enableCell');
  $('.ceil').bind('click', function(){
    selectCell(this);
  });
}
function disablePool(ceil){
  $('#pool').removeClass('enablePool');
  $('#pool').addClass('disablePool');
  $('.ceil').removeClass('enableCell');
  $('.ceil').unbind('click');
  if(ceil){
    $(ceil).removeClass('ceil');
    $(ceil).addClass('selectedCell');
  }
}
function selectCell(ceil){
  if(transmission_errors > 2){
    return;
  }
  disablePool(ceil);
  var temp = ceil.id.match(/\d+/g);
  var i = temp[0], j = temp[1];
  $.ajax({ cache: false
         , type: "POST"
         , url: "/addActionMsg"
         , dataType: "json"
         , data: { site: CONFIG.site
                 , i: i
                 , j: j
                 , type: "pool"
                 , roomId: CONFIG.roomId
                 }
         , error: function(data){
             transmission_errors++;
             setTimeout(function(){ selectCell(ceil); }, 5*1000);
           }
           , success: function(data){
             if(data.status == "ok"){
               transmission_errors = 0;
               enablePocket();
             }
           }
        });
}
function enablePocket(){
  $('.unopenPktCard').addClass('enablePktCard');
  $('.unopenPktCard').bind('click', function(){
    selectPktCard(this);
  });
}
function disablePocket(card){
  $('.unopenPktCard').removeClass('enablePktCard');
  $('.unopenPktCard').unbind('click');
  if(card){
    $(card).removeClass('unopenPktCard');
    $(card).addClass('openedPktCard');
  }
}
function selectPktCard(card){
  if(transmission_errors > 2){
    return;
  }
  disablePocket(card);
  var temp = card.id.match(/\d+/g);
  var i = temp[1];
  $.ajax({ cache: false
         , type: "POST"
         , url: "/addActionMsg"
         , dataType: "json"
         , data: { site: CONFIG.site
                 , i: i
                 , type: "pocket"
                 , roomId: CONFIG.roomId
                 }
         , error: function(data){
             transmission_errors++;
             setTimeout(function(){ selectPktCard(card); }, 5*1000);
           }
         , success: function(data){
             if(data.status == "ok"){
               transmission_errors = 0;
             }
           }
        });
}
function startCountDown(site, time){
  $('#timer' + site).text(time);
  timer = setInterval(function(){
    var count = parseInt($('#timer' + site).text());
    if(count <= 0){
      stopCountDown();
    }
    else{
      $('#timer' + site).text(count - 1);
    }
  }, 1*1000);
}
function stopCountDown(){
  $('.timer').text('');
  clearInterval(timer);
}
function userJoin(message){
  if(message.site >= 0 && message.site < CONFIG.siteNum){
    var info  = message.info;
    $('#roomClient' + message.site).html("<p><img src=\"" + info.image 
        + "\" /></p><p><a href=\"" + info.url + "\" target=\"_blank\">" 
        + info.name + "</a></p><p>" + info.location + "</p><p>分数：" 
        + info.score + "</p><p>胜率：" 
        + (info.play == 0 ? 0 : Math.floor(info.win/info.play*10000)/100) 
        + "%</p><p>  逃率：" + (info.play == 0 ? 0 : Math.floor(info.part/info.play*10000)/100) 
        + "%</p>");
    if(message.site == CONFIG.site){
      $('#roomClient' + message.site).append("<button id=\"readyBtn\">Ready</button>");
      $('#readyBtn').bind('click', function(){
        addReady();
      });
    }
    $('#roomClient' + message.site).append("<p id=\"ready" + message.site 
        + "\" class=\"ready\">Ready !</p>");
    $('#client' + calculateShowSite(message.site)).html("<img src=\"" + info.image 
        + "\" /><p><a href=\"" + info.url + "\" target=\"_blank\">" + info.name 
        + "</a></p><p>" + info.location + "</p>");
  }
}
function addReady(){
  $.ajax({ cache: false
       , type: "POST"
       , url: "/ready"
       , dataType: "json"
       , data: { site: CONFIG.site
               , roomId: CONFIG.roomId
               }
       , error: function(data){
           transmission_errors++;
           setTimeout(function(){ addReady(); }, 5*1000);
         }
       , success: function(data){
           if(data.status == "ok"){
             transmission_errors = 0;
             $('#readyBtn').unbind('click');
             $('#readyBtn').bind('click', function(){
               addCancelReady();
             });
             $('#readyBtn').text("Cancel");
           }
         }
      });
}
function addCancelReady(){
  $.ajax({ cache: false
       , type: "POST"
       , url: "/cancelReady"
       , dataType: "json"
       , data: { site: CONFIG.site
               , roomId: CONFIG.roomId
               }
       , error: function(data){
           transmission_errors++;
           setTimeout(function(){ addCancelReady(); }, 5*1000);
         }
       , success: function(data){
           if(data.status == "ok"){
             transmission_errors = 0;
             $('#readyBtn').unbind('click');
             $('#readyBtn').bind('click', function(){
               addReady();
             });
             $('#readyBtn').text("Ready");
           }
         }
      });
}
function addJoin(){
  $.ajax({ cache: false
       , type: "POST"
       , url: "/join"
       , dataType: "json"
       , data: { roomId: CONFIG.roomId }
       , error: function(data){
           transmission_errors++;
           setTimeout(function(){ addJoin(); }, 5*1000);
         }
       , success: function(data){
           if(data.status == "ok"){
             transmission_errors = 0;
             CONFIG.site = data.site;
             if(CONFIG.site == CONFIG.siteNum){
               $('#observe').show();
               $('#pocket'+CONFIG.mySite+' div').addClass('pocketCard');
               $('#pocket'+CONFIG.mySite+' div').removeClass('unopenPktCard');
             }
             longPoll();
           }
           else{
             if(data.error == "hasEnter"){
               alert("你已经进入一个房间！");
               location.href = '/hall';
             }
           }
         }
      });
}
function userAction(message){
  switch(message.info.type){
    case 'pool':
      var ceilId = '#ceil' + message.info.i + '_' + message.info.j;
      $(ceilId).html("<img src=\"/images/" + message.info.kind + ".jpg\" alt=\"" + message.info.kind + "\" />");
      $(ceilId).removeClass('ceil');
      $(ceilId).addClass('selectedCell');
      break;
    case 'pocket':
      var pktCardId = "#card" + calculateShowSite(message.site) + '_' + message.info.i;
      $(pktCardId).html("<img src=\"/images/" + message.info.kind + ".jpg\" alt=\"" + message.info.kind + "\" />");
      if(message.site != CONFIG.site){
        $(pktCardId).addClass('openedPktCard');
      }
      break;
    case 'wrongKind':
      var ceilId = '#ceil' + message.info.i + '_' + message.info.j;
      var pktCardId = "#card" + calculateShowSite(message.site) + '_' + message.info.card;
      flipWrongCards(ceilId, pktCardId, message.site);
      break;
    case 'timeout':
      if(message.info.enablePocket == true){
        disablePocket();
        var ceilId = '#ceil' + message.info.i + '_' + message.info.j;
        $(ceilId).addClass('ceil');
        $(ceilId).html("<img src=\"/images/default.jpg\" alt=\"背面\" />");
        $(ceilId).removeClass('selectedCell');
      }
      else{
        disablePool();
      }
      break;
    default:
      break;
  }
}
function userPart(message){
  if(message.site >= 0 && message.site < CONFIG.siteNum){
    $('#roomClient' + message.site).text("");
    if(CONFIG.isGameStart == true){
      $('#client' + calculateShowSite(message.site)).text("该用户已掉线");
    }
  }
}
$(document).ready(function(){
  addJoin();
});
window.onbeforeunload = function(){
  if(CONFIG.isGameStart == true && CONFIG.site >= 0 && CONFIG.site < CONFIG.siteNum){
    return "这将会丢失所有游戏信息！！！";
  }
};
$(window).unload(function(){
  $.ajax({ cache: false
       , async: false
       , type: "POST"
       , url: "/part"
       , dataType: "json"
       , data: { site: CONFIG.site
               , roomId: CONFIG.roomId
               }
      });
});
