const express = require('express');
const {exist ,mkdirp} = require("../public/js/publicDir");
const multer = require("multer");
const path = require("path");
const Room = require("../schemas/room");
const Chat = require("../schemas/chat");

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

router.get('/', async (req, res, next) => {
  try {
    const rooms = await Room.find({});
    res.render("main", { rooms, title: "채팅방", error: req.flash("roomError") });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get("/room", (_req, res) => {
  res.render("room", { title: "채팅방 입장" });
});

router.post("/room", async (req, res, next) => {
  try {
    const room = new Room({
      title: req.body.title,
      max: req.body.max,
      owner: req.session.color,
      password: req.body.password,
    });
    const newRoom = await room.save();
    const io = req.app.get("io");
    io.of("/room").emit("newRoom", newRoom);
    res.redirect(`/room/${newRoom._id}?password=${req.body.password}`);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get("/room/:id", async (req, res, next) => {
  try {
    const room = await Room.findOne({ _id: req.params.id });
    const chats = await Chat.find({ room: room._id }).sort("cratedAt");
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
    return res.render("chat", {
      room,
      chats,
      title: room.title,
      number: (rooms && rooms[req.params.id] && rooms[req.params.id].length + 1) || 1,
      user: req.session.color,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.delete("/room/:id", async (req, res, next) => {
  try {
    await Room.remove({ _id: req.params.id });
    await Chat.remove({ room: req.params.id });
    req.app.get("io").of("/room").emit("removeRoom",req.params.id);
    res.status(200).send("REMOVE_ROOM_OK");
  } catch (error) {
    console.error(error);
    next(error);
  }
}); 

router.post('/room/:id/chat', async (req, res, next) => {
  try {
    const chat = new Chat({
      room: req.params.id,
      user: req.session.color,
      chat: req.body.chat,
    });
    await chat.save();
    req.app.get('io').of('/chat').to(req.params.id).emit('chat', chat);
    res.send('ok');
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.post("/room/:id/img", upload.single("img"), async (req, res,next) => {
  try {
    const chat = new Chat({
      room: req.params.id,
      user: req.session.color,
      img: req.file.filename,
    });
    await chat.save();
    req.app.get("io").of('/chat').to(req.params.id).emit("chat",chat);
    res.send("ok");
  } catch (error) {
    console.error(error);
    next(error);
  }
});

module.exports = router;