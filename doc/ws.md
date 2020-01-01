# ws 

웹 소켓 서버

- 지속적으로 데이터를 보내기 때문에 따로 응답이 필요 없다.
- req 객체를 통해 접속자의 IP를 알 수 있다.
- req.headers['x-forwarded-for] : 프록시(중계 서버) 거치기 전의 아이피
- req.connection.remoteAddress 최종 아이피

```
    클라이언트 -> (http) -> 서버 
    클라이언트 -> ( ws )  -> 서버
```

## STATE
```
    CONNECTING: 연결중
    OPEN: 연결 수립
    CLOSING: 종료중
    CLOSED: 종료    
```

## Server
**app.js**

```js
    webSocket(server);
```

## Socket
**socket.js**

```js
    const WebSocket = require("ws");

    // Express 서버를 받아오기
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
                console.log("클라이언트 접속 해제",ip);
                clearInterval(ws.interval);
            });
            // setInterveal은 적절한 시점에 clearInterval을 해줘야 관리가 된다.
            // 해제를 안 할 시 메모리 누수가 생긴다.
            // 접속자가 있다고 생각하여 메세지를 보내는데 소켓을 종료했는데 클라이언트로 메시지를 보내지 않기 위해 
            const interval = setInterval(() => {
                if(ws.readyState === ws.OPEN){ 
                    ws.send("서버에서 클라이언트로 메세지를 보냅니다.");
                }
            },3000);
            ws.interval = interval;
        });
    };
```

## Client 
**main.pug**

```pug
  script.
    // 웹소켓 스크립트 부분 
    // 프로토콜만 ws나 wss로 바꾼다.
    // wss는 https를 쓰는경우
    
    // connection이 맺어진다.
    // 새로고침 하는 순간 페이지를 떠난거다.
    var webSocket = new WebSocket("ws://localhost:8015");
    webSocket.onopen = function () {
      console.log('서버와 웹소켓 연결 성공!');
    };
    webSocket.onmessage = function (event) {
      console.log(event.data);
      webSocket.send('클라이언트에서 서버로 답장을 보냅니다');
    };
```