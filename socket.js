const SocketIO = require("socket.io");
const asxios = require("axios");
const cookieParser = require("cookie-parser");
const cookie = require("cookie-signature");

module.exports = (server, app, sessionMiddleWare) => {
  const io = SocketIO(server, { path: "/socket.io" }); 
  app.set("io", io); // !! 모든 라우터에서 사용하기 위해 소켓 정보 저장

  const room = io.of("/room");
  const chat = io.of("/chat");

  // !! 익스프레스 미들웨어를 소켓 IO 사용
  io.use((socket,next)=>{
    cookieParser(process.env.COOKIE_SECRET)(socket.request,socket.request.res,next);
  });
  io.use((socket, next) => {
    sessionMiddleWare(socket.request, socket.request.res, next);
  });

  room.on("connection", socket => {
    // const req = socket.request;
    // const ip = req.headers["x-forwarded-for"] || req.connection;
    console.log("room 네임스페이스에 접속", socket.id);
    socket.on("disconnect", () => {
      console.log("room 네임스페이스 접속 해제");
    });
  });

  chat.on("connection", socket => {
    const req = socket.request;
    // const ip = req.headers["x-forwarded-for"] || req.connection;
    console.log("chat 네임스페이스에 접속", socket.id);

    const {headers: { referer }} = req;
    const roomId = referer
            .split("/")[referer.split("/").length - 1]
            .replace(/\?.+/, "");

    socket.join(roomId); // * 방에 접속

    // !! 라우터에서 시스템메시지 저장 요청
    asxios.post(`http://localhost:8015/room/${roomId}/sys`, { type: "join", }, 
    {
      headers: {
        Cookie: `connect.sid=${'s%3A'+cookie.sign(req.signedCookies['connect.sid'], process.env.COOKIE_SECRET)}`,
      }
    });

    socket.on("disconnect", async () => {
      console.log("chat 네임스페이스 접속 해제");
      socket.leave(roomId); // * 방 나가기
      // !! owner 확인 
      var data = await asxios.get(`http://localhost:8015/u/room/${roomId}/owner`);
      console.log(JSON.parse(data.data).owner, socket.id)
      if(owner === socket.id ){
        await asxios.delete(`http://localhost:8015/u/room/${roomId}/owner`,{user:socket.id});
        await asxios.patch(`http://localhost:8015/u/room/${roomId}/owner/delegate`);
      }
      const currentRoom = socket.adapter.rooms[roomId];
      const userCount = currentRoom ? currentRoom.length : 0;
      if (userCount === 0) {
        asxios
          .delete(`http://localhost:8015/room/${roomId}`)
          .then(() => {
            console.log(`방: ${roomId} 제거 성공`);
          })
          .catch(error => {
            console.log(error);
          });
      } 
      else {
        asxios.post(`http://localhost:8015/room/${roomId}/sys`, { type: "exit", }, 
        {
          headers: {
            Cookie: `connect.sid=${'s%3A'+cookie.sign(req.signedCookies['connect.sid'], process.env.COOKIE_SECRET)}`,
          }
        });
      }
    });

  });
  
};