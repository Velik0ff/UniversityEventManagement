const mongoose = require("mongoose");

var EventSchema = new mongoose.Schema({
	eventName:{ type: String, required: true },
	equipment:[
		{
			equipID: { type: String, required: true },
			reqQty: { type: Number }
		}],
	eventSpaces:{ type: Number, required: true },
	eventTypeID:{ type: String, required: true },
	staffRequired:[
		{
			roleName: { type: String, required: true },
			reqNum: { type: Number }
		}],
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