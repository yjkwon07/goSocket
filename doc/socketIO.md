# Socket

Sokcet.IO는 처음에 HTTP 요청으로 웹소켓 사용 가능 여부를 묻는다.

## Basic Setting

### Server
**app.js**
```js
    const webSocket = require('./socket');
    
    // color-hash는 그냥 익명 사용자를 컬러로 구분하기위한 패키지이다.
    app.use((req,_res,next)=>{
      if(!req.session.color) {
        const colorHash = new colorHash();
        req.session.color = colorHash.hex(req.session);
      }
      next();
    });

    // 소켓 미들웨어에서 사용하기 위해 sessionMiddleWare를 따로 분리한다. 
    const sessionMiddleware = session({
      resave: false,
      saveUninitialized: false,
      secret: process.env.COOKIE_SECRET,
      cookie: {
        httpOnly: true,
        secure: false,
      },
    });

    webSocket(server, app, sessionMiddleware);
```

### Socket
- ws와 다른점 
  - Socket.IO에서는 메세지 이벤트를 키와 값으로 구분할 수 있습니다. 
  - 즉, 메세지를 구분할 수 있다. 
**socket.js**
```js
    const SocketIO = require("socket.io");

    module.exports = (server) => {
        // 클라이언트에서 접속할 path setting
        const io = SocketIO(server, { path: "/socket.io" });

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
            // 메세지를 key, value로 구분
            socket.interval = setInterval(() => {
                socket.emit("news", "Hello Socket.IO"); 
            }, 3000);
        });
    };
```

### Client
**index.pug**
- Sokcet.IO는 처음에 HTTP 요청으로 웹소켓 사용 가능 여부를 묻는다.
  - 하지만 웹소켓 가능 여부 패킷을 보내지 않고 요청을 할 수 있다.
```pug
  script(src="/socket.io/socket.io.js")
  script.
    // 웹소켓 스크립트 
    var socket = io.connect("http://localhost:8015",{
      path:"/socket.io",
      transports: ['websocket'], // 웹소켓 가능여부 패킷을 보내지 않고 요청하기
    });
    socket.on("news", function(data){
      console.log(data);
      socket.emit("message", "Hello Node.js");
      socket.emit("reply","Hello reply");
    });
```

## Chat Setting 

### 네임 스페이스, 소켓에서 미들웨어 사용하기  
**socket.js**
```js
module.exports = (server,app,sessionMiddleWare) => {
    const io = SocketIO(server, { path: "/socket.io" });
    app.set("io",io); // 익스프레스 변수 저장 방법 
    // ex) req.app.get("io").off("/room").emit
    
    // 네임스페이스 default -> io.of("/")
    // 네임스페이스로 실시간 데이터가 전달될 주소를 구별할 수 있습니다.
    // 기본 네임스페이스는 '/' 입니다.
    const room = io.of("/room");
    const chat = io.of("/chat");

    // 익스프레스 미들웨어를 소켓IO에서 쓰는 방법
    // use안에 (req,res,next)를 붙여주면 된다. 
    io.use((socket, next) => {
        sessionMiddleWare(socket.request, socket.request.res, next);
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
                asxios.delete(`http://localhost:8015/room/${roomId}`)
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
}
```

## DB 작업 주의!! 
비즈니스 로직은 라우터에서 해결하는것을 권장 
- 직접 디비를 조작하지 말고 (socket통신은 socket 통신으로만)
- 라우터를 통해 조작하는게 좋다. (지저분함이 있을 수 있기 때문에)
  
**chat.pug**
```pug
    script.
        document.querySelector("#chat-form").addEventListener("submit",function(e){
        e.preventDefault();
        if(e.target.chat.value){
            var xhr = new XMLhttpRequest();
            xhr.onload = function(){
            if(xhr.status === 200){
                e.target.chat.value = "";
            }
            else {
                console.error(xhr.responseText);
            }
            };
            xhr.open("POST","/room/#{room._id}/chat");
            xhr.setRequestHeader("Content-Type","application/json");
            xhr.send(JSON.stringify({chat:this.chat.value}));
        }
        });
```

**socket.js**
```js
    socket.on("disconnect", () => {
        console.log("chat 네임스페이스 접속 해제");
        socket.leave(roomId); // 방 나가기
        const currentRoom = socket.adapter.rooms[roomId];
        const userCount = currentRoom ? currentRoom.length : 0;
        if (userCount === 0) {
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
```