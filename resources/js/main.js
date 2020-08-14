
    'use strict';
    console.log("main.js 시작");

    var isChannelReady = false;
    var isInitiator = false;
    var isStarted = false;
    var localStream;
    var pc;
    var remoteStream;

    var remoteVideo = document.getElementById('right_cam');
    var localVideo =  document.getElementById('left_cam');

    var socket = io.connect();

    // *** pcConfig ***
    var pcConfig = {
      'iceServers':[{
        urls:'stun:stun.l.google.com:19302'
      }, // rtc중계가 끊어질것을 대비한 임시 서버
      {urls:"turn:numb.viagenie.ca",
      credential: "muazkh",
      username:"webrtc@live.com"}
    ]};
    // *** pcConfig ***

    var sdpConstraints={
      offerToReceiveAudio:true,
      offerToReceiveVideo:true,
    };

    localVideo.addEventListener("loadedmetadata",function(){
      console.log('left: gotStream with width and height:',localVideo.videoWidth,localVideo.videoHeight);
    });

    remoteVideo.addEventListener("loadedmetadata",function(){
      console.log('left: gotStream with width and height:',localVideo.videoWidth,localVideo.videoHeight);
    });

    // remoteVideo.addEventListener("resize"()=>{
    //   console.log('Remote video size changed to ${remoteVideo.videoWidth}x${remoteVideo.videoHeight}');
    // };

    socket.on('connect',function(){
      console.log("index : connect 실행");
      socket.emit("onCollabo",socket.id);
    });

    socket.on('collabo',function(room){
      console.log("index : collabo 실행, room : "+room);
      socket.emit('create or join',room);
      console.log('Attempted to create or Join room : ',room);
    });

    socket.on('ready', function() {
      console.log('Socket is ready');
    });

    socket.on('created',function(room,id){
      console.log("index : created 실행");
      console.log('Created room : '+room+" : "+id);
      isInitiator = true;
    });

    socket.on('full',function(room){
      console.log("index : full 실행");
      console.log('Room '+room+'is full');
    });

    socket.on('join',function(room){
      console.log("index : join 실행, room: "+room);
      isChannelReady = true;
      console.log("index : join 실행, isChannelReady: "+isChannelReady);

    });

    socket.on('joined', function(room){
      console.log("index : joined 실행");
      console.log('joined : '+room);
      isChannelReady = true;
    });

    socket.on('log',function(array){
      // console.log("index : log 실행");
      console.log.apply(console, array);
    });

    function sendMessage(message){
      console.log('Client sending message:',message);
      socket.emit('message',message);
      console.log("function sendMessage(message) 종료");
    }

    // 클라이언트가 받는 메세지
    // web socket을 통해 서로 메세지를 주고 받으면서 연결을 확립
    socket.on('message',function(message){
      console.log("index : message 실행");
      console.log('Client received message:',message);
      if(message === 'got user media'){
        maybeStart();
      }else if (message.type === 'offer') {
        if (!isInitiator && !isStarted) {
            maybeStart();
        }
        pc.setRemoteDescription(new RTCSessionDescription(message));
        doAnswer();
        console.log("doAnswer() 실행");
      }else if (message.type === 'answer' && isStarted) {
        pc.setRemoteDescription(new RTCSessionDescription(message));
      }else if (message.type==='candidate' && isStarted) {
        var candidate = new RTCIceCandidate({
          sdpMLineIndex: message.label,
          candidate: message.candidate
        });
        pc.addIceCandidate(candidate);
      }else if (message === 'bye' && isStarted) {
        handleRemoteHangup();
      }
    });

    // getUserMedia를 통해 local stream을 가져오게 된다.
    navigator.mediaDevices.getUserMedia({
      audio:true,
      video:true
    }) // audio,video값을 스트림으로 가져올 수 있다.
    .then(gotStream)
    .catch(function(e){
      alert("getUserMedia() error: "+e.name);
    });

    // 전달받은 stream을 localVideo에 붙이게 된다.
    function gotStream(stream){
      console.log("Adding local stream");
      localStream = stream;
      localVideo.srcObject = stream;
      sendMessage("got user media");
      if(isInitiator){ // isInitiator가 true이면 maybeStart 함수 호출
        console.log("function gotStream(stream)--maybeStart() 실행");
        maybeStart(); // isInitiator는 방 최초 생성자 true
      }
    }

    var constraints={
      video:true
    };

    console.log('Getting user media with constraints',constraints);

    if (location.hostname !== 'localhost') {
      requestTurn(
        "stun:stun.l.google.com:19302"
      );
    }

    function maybeStart(){
      console.log(">>>>>>>>> maybeStart()");
      console.log("!isStarted => "+!isStarted);
      console.log("typeof(localStream) => ",typeof(localStream)!=='undefined');
      console.log("isChannelReady => "+isChannelReady);

      if(!isStarted && typeof(localStream) !== 'undefined' && isChannelReady){
        console.log("maybeStart() 정상 실행");
        console.log(">>>>>>> creating peer connection");
        createPeerConnection(); // peerconnection 생성
        pc.addStream(localStream); // peerconnection에 localStream을 붙인다.
        isStarted = true;
        console.log("isInitiator",isInitiator);
        if(isInitiator){
          console.log("doCall() 실행");
          doCall(); // isInitiator인경우 같은방에있는 client에게 rtc요청
        }
      }
    }

    window.onbeforeunload = function(){
      sendMessage('bye');
    };
    //////////////////////////////////////////////////////////////////////////////////

    function createPeerConnection(){
      console.log("function createPeerConnection() 실행");
      try {
        pc = new RTCPeerConnection(pcConfig); // pcConfig값으로 pc(peerconnection) 생성
        // pc에 이벤트 추가(IceCandidate, RemoteStreamAdded, RemoteStreamRemoved)
        pc.onicecandidate = handleIceCandidate; // 서로 통신 채널을 확립하기 위한 방법
        //스트림이 들어오면 발생하는 이벤트
        pc.onaddstream = handleRemoteStreamAdded;
        pc.onremovestream = handleRemoteStreamRemoved;
        console.log('RTCpeerConnection 생성되었습니다.');
      } catch (e) {
        console.log('PeerConnection 생성 실패, exception => '+ e.message);
        alert('RTCpeerConnection object를 만들지 못했습니다.');
        return;
      }
    }

    function handleIceCandidate(event){
      console.log('icecandidate event: ', event);
      if (event.candidate) {
        sendMessage({
          type:'candidate',
          label:event.candidate.sdpMLineIndex,
          id:event.candidate.sdpMid,
          candidate:event.candidate.candidate
        });
      }else{
        console.log('End of candidates.');
      }
    }

    function handleCreateOfferError(event){
      console.log('createOffer() error: ',event);
    }

    // docall함수에서는 pc.createOffer를 통해 통신 요청
    function doCall(){
      console.log('Sending offer to peer');
      pc.createOffer(setLocalAndSendMessage,handleCreateOfferError);
    }

    function doAnswer(){
      console.log('Sending answer to peer');
      pc.createAnswer().then(
        setLocalAndSendMessage,
        onCreateSessionDescriptionError
      );
    }

    function setLocalAndSendMessage(sessionDescription){
      pc.setLocalDescription(sessionDescription);
      console.log('setLocalAndSendMessage sending message', sessionDescription);
      sendMessage(sessionDescription);
    }

    function onCreateSessionDescriptionError(error){
      trace('Failed to create session description: '+error.toString());
    }

    // turn서버 요청 CORS 문제 발생
    function requestTurn(turnURL){
      var turnExists = true;
      // for (var i in pcConfig.iceServers){
      //   if(pcConfig.iceServers[i].urls.substr(0,5)==='stun:'){
      //     turnExists = true;
      //     turnReady = true;
      //     console.log('Exist stun server');
      //     break;
      //   }
      // }
      // if (!turnExists) {
      //   console.log("Getting TURN server from ", turnURL);
      //   // // No TURN server. Get one from computeengineondemand.appspot.com:
      //   var xhr = new XmlHttpRequest();
      //   xhr.onreadystatechange = function(){
      //     if (xhr.readyState === 4 && xhr.status === 200) {
      //       var turnServer = JSON.parse(xhr.responseText);
      //       console.log('Got TURN server: ',turnServer);
      //       pcConfig.iceServers.push({
      //         'urls':'turn'+turnServer.username+'@'+turnServer.turn,
      //         'credential':turnServer.password
      //       });
      //       turnReady = true;
      //     }
      //   };
      //
      //   xhr.open("GET",turnURL,true);
      //   xhr.send();
      // }
    }

      // remoteStream이 들어오면, localVideo와 마찬가지로
      function handleRemoteStreamAdded(event){
        console.log('Remote stream added.');
        remoteStream = event.stream;
        console.log(event);
        remoteVideo.srcObject = remoteStream; // remoteVideo에 remoteStream을 붙여준다.
      }

      function handleRemoteStreamRemoved(event) {
        console.log('Remote stream removed. Event: ', event);
      }

    function hangup(){
      console.log('Hanging up');
      stop();
      sendMessage('bye');
    }

    function handleRemoteHangup(){
      console.log('Session terminated');
      stop();
      isInitiator = false;
    }

    function stop(){
      isStarted = false;
      pc.close();
      pc = null;
    }
    // })
