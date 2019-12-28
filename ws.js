/**
 * ws websocket의 기본적인 기능만 구현한 상태 
 */
const WebSocket = require("ws");

// Express 서버를 받아오기

// 클라이언트 -> http -> 서버
// 클라이언트 -> ws -> 서버

module.exports = (server) => {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws, req) => {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        console.log("클라이언트 접속",ip);
        
        // 소켓 이벤트 
        ws.on("message", (message)=> {
            console.log(message);
        });
        ws.on("error", (error) => {
            console.log(error);
        });
        ws.on("close", () => {
            console.log("클라이언트 접속 해제", ip);
            clearInterval(ws.interval);
        });

        const interval = setInterval(() => {
            if(ws.readyState === ws.OPEN){ 
                ws.send("서버에서 클라이언트로 메세지를 보냅니다.");
            }
        },3000);
        ws.interval = interval;
    });
};