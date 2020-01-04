# Cookie-Signature
session 정보 아이디를 유지하기 위함
 
암호화가 적용된 쿠키 만들기 => 암호를 모르면 쿠키의 내용을 볼 수 없다. 
- cookieParser(**[cookiesSecretCode]**)
- connect.sid가 **세션쿠키**(암호화된 쿠키)입니다.  
- require("cookie-signature")
  - cookie.sign(쿠키내용,쿠키암호화 키)

axios 요청을 보낼 때 새로운 요청 **[requestInfo reset]** 을 만든것이기 때문에 **같은 유저가** 보냈다는것을 cookie에 정보를 넣는다.
```js 
    asxios.post(`http://localhost:8015/room/${roomId}/sys`, {
        type: "exit",
    }, 
    {
        headers: {
            Cookie: `connect.sid=${'s%3A'+cookie.sign(req.signedCookies['connect.sid'], process.env.COOKIE_SECRET)}`,
        }
    });
```
- connect.sid가 express서버로 오면 암호화된것을 **[cookiesSecretCode]** 를 대조하여 푼다. 
- 다시 새로운 익스프레스 서버로 보낼때 암호화 과정이 필요하다. 
  - client에서는 encrypt된 쿠키를 갖고 있고 서버에서 conncet.sid를 받을 때 알아서 decrypt되어있다. 