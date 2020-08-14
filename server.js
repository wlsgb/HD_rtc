var express = require('express');
var app = express();
var nodeStatic = require('node-static');
var https = require('https');
var fs = require('fs');
var port = 3000;



var httpsOptions = {
    key: fs.readFileSync('./security/cert.key'),
    cert: fs.readFileSync('./security/cert.pem')
}

var server = https.createServer(httpsOptions, app,function(request, response) {
  fileServer.serve(request, response);
}
//=========================================================================
//   , function(request,response){
//   var _url = request.url;
//   console.log('_url:'+_url);
//   var queryData = url.parse(_url,true).query;
//   console.log(queryData.id);
//
//   if(_url == '/'){
//     _url = '/index.html';
//   }
//   if(_url == '/favicon.ico'){
//     return response.writeHead(404);
//   }
//   response.writeHead(200);
//   response.end(fs.readFileSync(__dirname+_url));
// }
).listen(port, () => {
    console.log('서버를 시작합니다.' + port)
})

// https 설정 끝

var io = require('socket.io')(server);

var room_info;

// resources폴더를 사용할 수 있도록 등록한다.
app.use(express.static(__dirname + '/resources'));
app.use(express.static(__dirname + '/js'));
app.get('/chatGide', (request, response) => {
    console.log(request.param("room"));
    console.log(request.param("user"));
    room_info = request.param("room")+request.param("user");
    console.log('https://192.168.0.167:3000/chatGide?room='+request.param("room")+'&user='+request.param("user"));
    response.sendFile(__dirname + '/index.html');
})

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

  // socket.on('request',function(room){
  //   log("socket.on__request 실행");
  //   socket.broadcast.emit('getRequest',room);
  //   // io.sockets.in(room).emit('getRequest',room);
  //   room_info = room;
  // });
  //
  // socket.on('response',function(room, isGrant){
  //   log("socket.on__response 실행");
  //   if (isGrant) {
  //     socket.broadcast.emit('getResponse',room,isGrant);
  //     // io.sockets.in(room).emit('getResponse',room,isGrant);
  //     socket.emit('enter',room);
  //   }else {
  //     // TODO 거정했을때 서버 side
  //   }
  // });

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
