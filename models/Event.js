const mongoose = require("mongoose");

var EventSchema = new mongoose.Schema({
	eventName:{ type: String, required: [true, "Event name must be provided"] },
	equipment:[
		{
			equipID: { type: String, required: true },
			reqQty: { type: Number }
		}],
	eventSpaces:{ type: Number, required: [true, "Available spaces must be stated"] },
	eventTypeID:{ type: String, required: [true, "Event type must be chosen"] },
	// staffRequired:[
	// 	{
	// 		roleName: { type: String, required: true },
	// 		reqNum: { type: Number }
	// 	}],
	staffChosen:[
		{
			staffMemberID: { type: String, required: true },
			role: { type: String, required: true }
		}],
	date:{ type: Date },
	location: { type: String },
	numberOfVisitors: { type: Number }
});

module.exports = mongoose.model("Event",EventSchema);