var config = require('../config'),
    db = config.db.collection('user');

exports.increasePlay = function(id){
  db.find({id: id}).toArray(function(err, data){
    if(data.length <= 0){
      user = { id: id
             , win: 0
             , play: 1
             , part: 0
             , score: 0
             };
      db.save(user, function(err){
        if(err){
          console.log("err: " + err.toString);
          return false;
        }
      });
    }
    else{
      var play = data[0].play + 1;
      db.update({id: id}, {$set: {play: play}}, function(err){
        if(err){
          console.log("err: " + err.toString());
          return false;
        }
      });
    }
    return true;
  });
};

exports.increaseWin = function(id){
  db.find({id: id}).toArray(function(err, data){
    if(data.length <= 0){
      user = { id: id
             , win: 1
             , play: 1
             , part: 0
             , score: 0
             };
      db.save(user, function(err){
        if(err){
          console.log("err: " + err.toString);
          return false;
        }
      });
    }
    else{
      var win = data[0].win + 1;
      db.update({id: id}, {$set: {win: win}}, function(err){
        if(err){
          console.log("err: " + err.toString());
          return false;
        }
      });
    }
    return true;
  });
};

exports.getUserInfo = function(id, callback){
  db.find({id: id}).toArray(function(err, data){
    if(err){
      console.log("err: " + err.toString());
      return;
    }
    var user = { id: id
               , win: 0
               , play: 0
               , part: 0
               , score: 0
               };

    if(data && data.length > 0){
      user = data[0];
    }
    callback(user);
  });
};

exports.increasePart = function(id){
  db.find({id: id}).toArray(function(err, data){
    if(data.length <= 0){
      user = { id: id
             , win: 0
             , play: 1
             , part: 1
             , score: 0
             };
      db.save(user, function(err){
        if(err){
          console.log("err: " + err.toString);
          return false;
        }
      });
    }
    else{
      var part = data[0].part + 1;
      db.update({id: id}, {$set: {part: part}}, function(err){
        if(err){
          console.log("err: " + err.toString());
          return false;
        }
      });
    }
    return true;
  });
};

exports.addScore = function(id, score){
  db.find({id: id}).toArray(function(err, data){
    if(data.length <= 0){
      user = { id: id
             , win: 0
             , play: 0
             , part: 0
             , score: score
             };
      db.save(user, function(err){
        if(err){
          console.log("err: " + err.toString);
          return false;
        }
      });
    }
    else{
      var newScore = data[0].score + score;
      db.update({id: id}, {$set: {score: newScore}}, function(err){
        if(err){
          console.log("err: " + err.toString());
          return false;
        }
      });
    }
    return true;
  });
};

