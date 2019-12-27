
/**
 * ws websocket의 기본적인 기능만 구현한 상태 
 */
// const WebSocket = require("ws");

// // Express 서버를 받아오기
// module.exports = (server) => {
//     const wss = new WebSocket.Server({ server });

//     // 웹 소켓 서버
//     // 지속적으로 데이터를 보내기 때문에 따로 응답이 필요 없다.
//     // req 객체를 통해 접속자의 IP를 알 수 있다.
//     // req.headers['x-forwarded-for] 프록시(중계 서버) 거치기 전의 아이피
//     // req.connection.remoteAddress 최종 아이피
//     wss.on('connection', (ws, req) => {
//         const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
//         console.log("클라이언트 접속",ip);
        
//         // 소켓 이벤트 
//         ws.on("message", (message)=> {
//             console.log(message);
//         });
//         ws.on("error", (error) => {
//             console.log(error);
//         });
//         ws.on("close", () => {
//             console.log("클라이언트 접속 해제",ip);
//             clearInterval(ws.interval);
//         });
//         // setInterveal은 적절한 시점에 clearInterval을 해줘야 관리가 된다.
//         // 해제를 안 할 시 메모리 누수가 생긴다.
//         // 접속자가 있다고 생각하여 메세지를 보내는데 소켓을 종료했는데 
//         // 클라이언트로 메시지를 보내지 않기 위해 
//         const interval = setInterval(() => {
//             // CONNECTING: 연결중
//             // OPEN: 연결 수립
//             // CLOSING: 종료중
//             // CLOSED: 종료
//             if(ws.readyState === ws.OPEN){ 
//                 ws.send("서버에서 클라이언트로 메세지를 보냅니다.");
//             }
//         },3000);
//         ws.interval = interval;
//     });
// };
// // 클라이언트 -> http -> 서버
// // 클라이언트 -> ws -> 서버

// Sokcet.IO는 처음에 HTTP 요청으로 웹소켓 사용 가능 여부를 묻는다.

const SocketIO = require("socket.io");
const asxios = require("axios");

module.exports = (server,app,sessionMiddleWare) => {
    // 클라이언트에서 접속할 path setting
    const io = SocketIO(server, { path: "/socket.io" });
    app.set("io",io); // 익스프레스 변수 저장 방법 
    // req.app.get("io").off("/room").emit
    

    // 네임스페이스 
    // io
    // 네임스페이스로 실시간 데이터가 전달될 주소를 구별할 수 있습니다.
    // 기본 네임스페이스는 / 입니다.
    const room = io.of("/room");
    const chat = io.of("/chat");
    // 익스프레스 미들웨어를 소켓IO에서 쓴느 방법
    io.use((socket, next) => {
        // Socket.IO에서도 미들웨어를 사용할 수 있습니다. 
        // use안에 (req,res,next)를 붙여주면 된다. 
        sessionMiddleWare(socket.request, socket.request.res,next);
    });
    room.on("connection", (socket) => {
        console.log("room 네임스페이스에 접속");
        socket.on("disconnect", () => {
            console.log("room 네임스페이스 접속 해제");
        })
    });

    chat.on("conection", (socket) => {
        console.log("chat 네임스페이스에 접속");
        
        // req.headers.referer에 웹 주소가 들어있다.
        const req = socket.request;
        const {headers: {referer}} = req;
        const roomId = referer
                .split('/')[referer.split('/').length - 1]
                 .replace(/\?.+/, '');
        
        // socket.join(방 아이디)
        // socket.to(방 아이디).emit()
        // socket.leave(방 아이디)
        socket.join(roomId); // 방에 접속 

        socket.to(roomId).emit("join", {
            user: "system",
            chat: `${req.session.color}님이 입장하셨습니다.`
        });

        socket.on("disconnect", () => {
            console.log("chat 네임스페이스 접속 해제");
            socket.leave(roomId); // 방 나가기
            // 방에 인원이 하나도 없으면 방을 없앤다.
            // socket.adapter.rooms[방아이디]
            // 방 정보와 인원이 들어있다. 
            const currentRoom = socket.adapter.rooms[roomId];
            const userCount = currentRoom ? currentRoom.length : 0;
            if(userCount === 0) {
                asxios.delete(`http://localhost:8015/room/${roomID}`)
                .then(() => {
                    console.log("방 제거 요청 성공");
                })
                .catch((error) => {
                    console.log(error);
                });
            }
            else {
                socket.to(roomId).emit("exit", {
                    user: 'system',
                    chat: `${req.session.color}님이 퇴장하셨습니다.`
                });
            }
        });
    });

    io.on("connection", (socket) => {
        const req = socket.request;
        const ip = req.headers["x-forwarded-for"] || req.connection;
        // socket.id로 클라이언트를 구분 할 수 있다.
        console.log("새로운 클라이언트 접속!", ip, socket.id, req.ip);
        socket.on("disconnect", () => {
            console.log("클라이언트 접속 해제", ip, socket.id);
            clearInterval(socket.interval);
        });
        socket.on("error", (error) => {
            console.error(error);
        });
        socket.on("reply", (data) => {
            console.log(data);
        });
        socket.on("message", (data) => {
            console.log(data);
        });
        // ws와 다른점 
        // Socket.IO에서는 메세지 이벤트를 키와 값으로 구분할 수 있습니다. 
        // 즉, 메세지를 구분할 수 있다. 
        socket.interval = setInterval(() => {
            socket.emit("news", "Hello Socket.IO"); // key , value
        }, 3000);
    });
}