const mongoose = require("mongoose");

let RoomSchema = new mongoose.Schema({
	roomName: { type: String, required: [true, "Room name must be stated"] },
	capacity: { type: Number, required: [true, "Room capacity must be stated"] },
	events:[{
		eventID: { type: String, required: true },
		eventName: { type: String, required: true },
		date: { type: Date, required: true },
		endDate: { type: Date }
	}],
	customFields: [{
		fieldName: { type: String },
		fieldValue: { type: String }
	}]
});

module.exports = mongoose.model("Room",RoomSchema);