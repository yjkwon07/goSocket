// 방 목록과 채팅 내용 스키마를 만듭니다. 
// min은 최솟값

const mongoose = require('mongoose');

const {Schema} = mongoose;
const roomSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    max: {
        type: Number,
        required: true,
        default: 10,
        min: 2,
    },
    owner: {
        type: String,
        required: true,
    },
    password: String,
    createAt: {
        type:Date,
        default:Date.now
    },
});
module.exports = mongoose.model("Room",roomSchema);