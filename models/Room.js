const mongoose = require("mongoose");

var RoomSchema = new mongoose.Schema({
	roomName: { type: String, required: [true, "Room name must be stated"] },
	capacity: { type: Number, required: [true, "Room capacity must be stated"] },
	customFields: [{
		fieldName: { type: String },
		fieldValue: { type: String }
	}]
});

module.exports = mongoose.model("Room",RoomSchema);