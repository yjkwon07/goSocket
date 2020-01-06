const express = require('express');
const multer = require("multer");
const path = require("path");

const {exist ,mkdirp} = require("../public/js/publicDir");
const {NEWROOM,CHAT,DM,REMOVEROOM} = require("../socketInfo");

const Room = require("../schemas/room");
const Chat = require("../schemas/chat");
const User = require("../schemas/user");

const router = express.Router();

if(!exist(process.env.UPLOAD)) mkdirp(process.env.UPLOAD);
const upload = multer({
  storage: multer.diskStorage({
    destination(req,file,callback) {
      callback(null, process.env.UPLOAD);
    },
    filename(req,file,callback){
      const ext = path.extname(file.originalname);
      callback(null, path.basename(file.originalname, ext) + Date.now() + ext);
    },
  }),
  limits : {fileSize : 5 * 1024 * 1024},
});

router.get('/', async(req,res,next)=>{
  try {
    const rooms = await Room.find({});
    res.render("main", { rooms, title: "자유방", error: req.flash("roomError") });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get("/room/create", (_req,res)=>{
  res.render("room", { title: "채팅방 입장" });
});
router.post("/room/create", async(req,res,next)=>{
  try {
    const room = new Room({
      title: req.body.title,
      max: req.body.max,
      owner: req.session.color,
      password: req.body.password,
    });
    const newRoom = await room.save();
    req.app.get("io").of("/room").emit(NEWROOM,newRoom);
    res.redirect(`/room/${newRoom._id}?password=${req.body.password}`);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get("/room/:id", async(req,res,next)=>{
  try {
    const room = await Room.findOne({ _id: req.params.id });
    const chats = await Chat.find({ room: room._id }).sort("cratedAt");
    const user = await User.findOne({user: req.session.color});

    const io = req.app.get("io");
    const { rooms } = io.of("/chat").adapter;
    if (!room) {
      req.flash("roomError", "존재하지 않는 방입니다.");
      return res.redirect("/");
    }
    if (room.password && room.password !== req.query.password) {
      req.flash("roomError", "비밀번호가 틀렸습니다.");
      return res.redirect("/");
    }
    if (rooms && rooms[req.params.id] && room.max <= rooms[req.params.id].length) {
      req.flash("roomError", "허용 인원이 초과하였습니다.");
      return res.redirect("/");
    }
    if(user && user.ban){
      req.flash("roomError", "해당 방은 접근 제한된 방입니다.");
      return res.redirect("/");
    }
    // !! 유저 정보 저장 
    if(!user){
      var userCreate = new User({
        room: req.params.id,
        user: req.session.color,
        ban: false,
      });
      await userCreate.save();
    }
    return res.render(CHAT,{
      room,
      chats,
      number: rooms && rooms[req.params.id] && rooms[req.params.id].length,
      user: req.session.color,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
});
router.post('/room/:id/chat', async(req,res,next)=>{
  try {
    const chat = new Chat({
      room: req.params.id,
      user: req.session.color,
      chat: req.body.chat,
    });
    await chat.save();
    req.app.get('io').of('/chat').to(req.params.id).emit(CHAT, {
      sid:  req.body.sid,
      room: req.params.id,
      user: req.session.color,
      chat: req.body.chat,
    });
    res.status(200).json({msg:'ok'});
  } catch (error) {
    console.error(error);
    next(error);
  }
});
router.post("/room/:id/img", upload.single("img"), async(req,res,next)=>{
  try {
    const chat = new Chat({
      room: req.params.id,
      user: req.session.color,
      img: req.file.filename,
    });
    await chat.save();
    req.app.get('io').of('/chat').to(req.params.id).emit('chat', {
      sid: req.body.sid,
      room: req.params.id,
      user: req.session.color,
      chat: req.body.chat,
      img: req.file.filename,
    });
    res.status(200).json({msg:"ok"});
  } catch (error) {
    console.error(error);
    next(error);
  }
});
router.post('/room/:id/dm', async(req,res,next)=>{
  try {
    req.app.get('io').of('/chat').to(req.body.to).emit(DM, {
      from: req.body.from,
      msg: req.body.msg,
    });
    res.status(200).json({msg:'ok'});
  } catch (error) {
    console.error(error);
    next(error);
  }
});
router.delete("/room/:id", async(req,res,next) => {
  try {
    await Room.remove({ _id: req.params.id });
    await Chat.remove({ room: req.params.id });
    await User.remove({ room: req.params.id });
    setTimeout(()=>{req.app.get("io").of("/room").emit(REMOVEROOM,req.params.id)},2000);
    res.status(200).json({msg:"REMOVE_ROOM_OK"});
  } catch (error) {
    console.error(error);
    next(error);
  }
}); 

router.get("/u/room/:id/owner", async(req,res,next)=>{
  try {
    const room = await Room.findOne({_id:req.params.id});
    res.status(200).json(JSON.stringify({owner : room.owner}));
  } catch (error) {
    console.error(error);
    next(error);
  }
});
router.patch("u/room/:id/owner/delegate", async(req,res,next)=>{
  try {
    if(req.body && req.body.user){
      await room.update({owner: req.body.user},{room:req.params.id});
    }
    else {
      var user = await User.find({room:req.params.id});
      await room.update({owner:user[0].user},{room:req.params.id});
    }
    res.status(200).json({msg:"ok"});
  } catch (error) {
    console.error(error);
    next(error);
  }
});
router.delete("u/room/:id/owner", async(req,res,next)=>{
  try {
    await User.remove({user:req.body.user},{room:req.params.id});
    res.status(200).json({msg:"ok"});
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.post("/room/:id/sys", async(req,res,next)=>{
  try {
    const chat = req.body.type === "join" 
      ? `${req.session.color}님이 입장하셨습니다.` 
      : `${req.session.color}님이 퇴장하셨습니다.`;
    const sys = new Chat({
      room: req.params.id,
      chat,
      user: "system",
    });
    await sys.save();
    req.app.get("io").of("/chat").to(req.params.id).emit(req.body.type, {
      user: "system",
      chat,
      number: req.app.get("io").of("/chat").adapter.rooms[req.params.id].length
    });
    res.status(200).json({msg:"ok"});
  } catch (error) {
    console.error(error);
    next(error);
  }
});

module.exports = router;