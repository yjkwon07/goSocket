const mongoose = require("mongoose");
const {Schema} = mongoose;
const {Types: {ObjectId}} = Schema;
const user = new Schema({
    room: {
        type: ObjectId,
        required: true,
        ref: "Room"
    },
    user: {
        type: String, 
        required: true,
    },
    ban: {
        type: Boolean,
        required: true,
    },
    createAt: {
        type:Date,
        default:Date.now
    },
});
module.exports = mongoose.model("User", user);