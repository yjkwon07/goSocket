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
    console.log("room 네임스페이스에 접속");
    socket.on("disconnect", () => {
      console.log("room 네임스페이스 접속 해제");
    });
  });

  chat.on("connection", socket => {
    console.log("chat 네임스페이스에 접속");

    const req = socket.request;
    const {headers: { referer }} = req;
    const roomId = referer
            .split("/")[referer.split("/").length - 1]
            .replace(/\?.+/, "");

    socket.join(roomId); // 방에 접속

    socket.to(roomId).emit("join", {
      user: "system",
      chat: `${req.session.color}님이 입장하셨습니다.`
    });

    socket.on("disconnect", () => {
      console.log("chat 네임스페이스 접속 해제");
      socket.leave(roomId); // 방 나가기
      const currentRoom = socket.adapter.rooms[roomId];
      const userCount = currentRoom ? currentRoom.length : 0;
      if (userCount === 0) {
        // 직접 디비를 조작하지 말고 (socket통신은 socket 통신으로만),
        // 라우터를 통해 조작하는게 좋다. (지저분함이 있을 수 있기 때문에)
        asxios
          .delete(`http://localhost:8015/room/${roomId}`)
          .then(() => {
            console.log("방 제거 요청 성공");
          })
          .catch(error => {
            console.log(error);
          });
      } else {
        socket.to(roomId).emit("exit", {
          user: "system",
          chat: `${req.session.color}님이 퇴장하셨습니다.`
        });
      }
    });

  });

};