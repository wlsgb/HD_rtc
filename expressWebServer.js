function expressWebServer(){
}

// 1. 필요한 모듈을 가져온다.
var https = require('https'), // 웹서버를 실행하는 역할을 하는 https 모듈
    fs = require('fs'), // 파일을 읽기 위한 fs모듈
    express = require('express'), // MVC 패턴을 쉽게 구현해주는 express 모듈
    path = require('path'), // 경로 설정시 유용하게 해주는 path모듈
    bodyParser = require('body-parser'), // form tag post 방식에서는 post형식이므로 body를 탐색하기 위해필요
    app = express(), // app은 .express()모듈을 담는다.
    nodeStatic = require('node-static');
    urlencode = require('urlencode')
var port = 3000; // 서버의 포트번호를 설정한다.


// 2. routes 파일에 routing을 담당할 모듈 저의한 뒤 객체를 받아온다.
var routes = require("./routes"); // 현재 폴더내의 routes폴더를 가져온다.
var routesChat = require("./routes/chat"); // 현재 폴더내의 routes폴더를 가져온다.

// 3. app의 기본설정을 한다.
app.set("views",path.join(__dirname,"views")); // views폴더를 정한다.
app.set("view engine",'ejs');

// 이때 use의 순서가 바뀌면 에러가 난다.
app.use(bodyParser()); // app이 못하는 작업을 bodyParser가 하도록 한다.

app.use("/",routes); // '/'로 시작하는 요청이 온다면 routes에서 처리한다.

// resources폴더를 사용할 수 있도록 등록한다.
app.use(express.static(__dirname + '/resources'));


// https를 사용하기 위한 공개key와 비밀키를 읽어 httpsOptions에 담아놓는다.
var httpsOptions = {
    key: fs.readFileSync('./security/cert.key'),
    cert: fs.readFileSync('./security/cert.pem')
}

// <------- 서버 시작 ------------> //
// https 웹서버를 제작하기 위해 https키와 express()를 담은 app을 담아 서버를 제작한다.
var server = https.createServer(httpsOptions, app, function(request, response) {
  response.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
  request.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
  fileServer.serve(request, response);
}).listen(port, () => { // port번호를 가져와 서버를 구동한다.
    console.log('서버시작_포트번호 : ' + port)
})
/////////////////////////////////////////////////////////////////////////////////////////
// 오라클 연동 //
var oracledb = require('oracledb');
var config = {
  user:"hd",
  password:"hd",
  connectString:"192.168.0.122/orcl"
}
var conn;
oracledb.getConnection(config,(err,con)=>{
  if(err){
    console.log("접속에 실패했습니다.");
  }else {
    console.log("DB접속에 성공했습니다.");
    conn = con;
  }
});
oracledb.autoCommit=true;
// oracle = oracleConfig;
// var conn;
// conn = oracle.getConn();

//
// function todoWork(err,connection){
//   if(err){
//     console.error(err.message);
//     return;
//   }
//   connection.execute("select * from member",[],function(err,result){
//     if(err){
//       console.error(err.message);
//       doRelease(connection);
//       return;
//     }
//     console.log(result.metaData); // 테이블 스키마
//     console.log(result.rows); // 데이터
//     doRelease(connection);
//   });
// }
//
// function doRelease(connection){
//   connection.release(function (err){
//     if(err){
//       console.error(err.message);
//     }
//   });
// }

/////////////////////////////////////////////////////////////////////////////////////////

app.get('/chatGide', (req,res) => {
  var chatDefaultPath = 'https://192.168.0.167:3000/chatGide';
  var room = req.query.room;
  var userNum = req.query.userNum;
  console.log("unescape(req.query.user): " + unescape(req.query.user) + " : "+req.query.user);
  var user = req.query.user;

  room_info = room + user + userNum;
  var chatPath = chatDefaultPath + '?'  + 'room=' + room + '&user=' + user + '&userNum=' + userNum;
  conn.execute("insert into chatlog(cl_code, mem_code, cl_name, cl_url, cl_result, cl_room) values(chatlog_seq.nextVal, "+userNum+",'" +user + "', '"+chatPath+"', 'START','"+room+"')",function(err,result){
    if(err){
      console.log("채팅 시작중 등록 에러가 발생: " + err);
    }else {
      console.log("등록이 완료되었습니다 : "+result);
    }
  });
  res.render("chat");
})

// https 설정 끝

var io = require('socket.io')(server); //

var room_info; // 방 정보를 담는다.

io.on('connection',socket=>{
console.log(socket.id+"서버에 접속 되었습니다.");

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function(message) {
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    // io.sockets.in(room_info).emit('message', message);
    socket.broadcast.emit('message', message);
  });

  socket.on('request',function(room){
    log("socket.on__request 실행");
    socket.broadcast.emit('getRequest',room);
    // io.sockets.in(room).emit('getRequest',room);
    room_info = room;
  });

  socket.on('response',function(room, isGrant){
    log("socket.on__response 실행");
    if (isGrant) {
      socket.broadcast.emit('getResponse',room,isGrant);
      // io.sockets.in(room).emit('getResponse',room,isGrant);
      socket.emit('enter',room);
    }else {
      // TODO 거정했을때 서버 side
    }
  });

  socket.on('onCollabo',function(id){
    log("socket.on__onCollabo 실행, id:("+id+"),room_info:"+room_info);
    socket.emit("collabo",room_info);
  });

  socket.on('enter',function(room,id){
    log("socket.on__enter 실행 ");
    socket.emit('collabo',room);
    console.log('enter: '+room);
  });

  // socket.on('collabo',function(room){
  //   console.log("server : collabo 실행");
  //   socket.emit('create or join',room);
  //   console.log('Attempted to create or Join room',room);
  // });

  socket.on('connect', function(){
    log("socket.on__connect 실행");
    socket.emit('onCollabo',socket.id);
  });

  socket.on('create or join',function(room){
    log("socket.on__create or join 실행");
    log('Received request to create or join room : '+room);
    console.log("io.sockets.adapter.rooms: ");
    console.log(io.sockets.adapter.rooms);
    console.log("======================== ");
    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    log('Room : '+room+' now has '+numClients + ' client(s)');
    // console.log('clientsInRoom : '+clientsInRoom+' \n numClients : '+numClients);

    if(numClients===0){
      log(room+"번방이 만들어졌습니다.")
      socket.join(room);
      log('Client ID '+socket.id + ' created room ' + room);
      socket.emit('created', room);

    }else if (numClients===1) {
      log('Cliet ID '+socket.id + ' joined room '+room);
      io.sockets.in(room).emit('join',room);
      socket.join(room);
      log("socket.join("+room+")");
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready',room);
      socket.broadcast.emit('ready',room);
      log("else if (numClients===1) 종료");
    }else {
      log("풀방");
      socket.emit('full',room);
    }
  });

  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('disconnect', function(reason) {
    console.log(`Peer or server disconnected. Reason: ${reason}.`);
    socket.broadcast.emit('bye');
  });

  socket.on('bye', function(room) {
    console.log(`Peer said bye on room ${room}.`);
  });
});

module.exports = expressWebServer;
