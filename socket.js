/**
 * Socket.io
 */
const SocketIO = require("socket.io");
const asxios = require("axios");

module.exports = (server, app, sessionMiddleWare) => {
  const io = SocketIO(server, { path: "/socket.io" });
  app.set("io", io);

  const room = io.of("/room");
  const chat = io.of("/chat");

  io.use((socket, next) => {
    sessionMiddleWare(socket.request, socket.request.res, next);
  });

  room.on("connection", socket => {
    const req = socket.request;
    const ip = req.headers["x-forwarded-for"] || req.connection;

    console.log("room 네임스페이스에 접속",ip, socket.id, req.ip);
    socket.on("disconnect", () => {
      console.log("room 네임스페이스 접속 해제");
    });
  });

  chat.on("connection", socket => {
    const req = socket.request;
    const ip = req.headers["x-forwarded-for"] || req.connection;
    console.log("chat 네임스페이스에 접속", socket.id, req.ip);

    const {headers: { referer }} = req;
    const roomId = referer
            .split("/")[referer.split("/").length - 1]
            .replace(/\?.+/, "");

    socket.join(roomId); // 방에 접속

    socket.to(roomId).emit("join", {
      user: "system",
      chat: `${req.session.color}님이 입장하셨습니다.`,
      number: socket.adapter.rooms[roomId].length,
    });

    socket.on("disconnect", () => {
      console.log("chat 네임스페이스 접속 해제");
      socket.leave(roomId); // 방 나가기
      const currentRoom = socket.adapter.rooms[roomId];
      const userCount = currentRoom ? currentRoom.length : 0;
      if (userCount === 0) {
        asxios
          .delete(`http://localhost:8015/room/${roomId}`)
          .then(() => {
            console.log(`방: ${roomId} 제거 요청 성공`);
          })
          .catch(error => {
            console.log(error);
          });
      } else {
        socket.to(roomId).emit("exit", {
          user: "system",
          chat: `${req.session.color}님이 퇴장하셨습니다.`,
          number: socket.adapter.rooms[roomId].length
        });
      }
    });
    
  });

};