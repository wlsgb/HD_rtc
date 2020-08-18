// expressWebServer의 express객체를 생성한다.
// ** 생성된 객체가 있다면 생성된 객체를 참고한다. **
var express = require('express');
var router = express.Router(); // express객체중 routing하는 능력의 객체를 추출

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

 /* Get home page*/
function todoWork(err,connection){
    if(err){
      console.error(err.message);
      return;
    }
}
 router.get('/chatClient/',function(req,res){ // GET방식이며 '/'로 시작한다면 여기서 처리
   var resultData = [];
   conn.execute("select cl_code, mem_code, cl_name, cl_url, cl_result, cl_room, to_char(cl_date,'YYYY\"년\"MM\"월\"') as cl_date from chatlog order by cl_code DESC",[],function(err,result){
     if(err){
       console.error(err.message);
       // doRelease(result);
       return;
     }
     console.log("typeof(resultData): "+typeof(resultData)) // 테이블 스키마
     console.log("resultData[0]: "+resultData[0]) // 데이터
     resultData = result.rows;
     // doRelease(result);
     res.render("index",{
       resultData:resultData
     })
   });
 });
 function doRelease(connection){
   connection.release(function (err){
     if(err){
       console.error(err.message);
     }
   });
 }

module.exports = router; // module을 require 할 때 반환되는 것은 router이다.
