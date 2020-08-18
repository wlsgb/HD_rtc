
// var proto = oracleConfig.prototype;


function oracleConnection(){

  oracledb.getConnection(config,(err,con)=>{
    if(err){
      console.log("접속에 실패했습니다.");
    }else {
      console.log("DB접속에 성공했습니다.");
      conn = con;
    }
  });

  oracledb.autoCommit=true;

  return conn;
}


module.exports.oraConn = oracleConnection;
