var express = require('express');
var router = express.Router(); // express객체중 routing하는 능력의 객체를 추출
var path = require('path'),
    fs = require('fs');

var room_info; // 방 정보를 담는다.

 router.get("/chatGideTest",function(req,res){
   console.log(port+"번호입니다.");
   var room = req.query.room;
   var user = req.query.user;

   res.render("chat",{
     room:room,
     user:user
   })

 })

 module.exports = router; // module을 require 할 때 반환되는 것은 router이다.
