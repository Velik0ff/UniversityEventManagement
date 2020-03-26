const mongoose = require("mongoose");

var EventSchema = new mongoose.Schema({
	eventName:{ type: String, required: [true, "Event name must be provided"] },
	equipment:[
		{
			equipID: { type: String, required: true },
			reqQty: { type: Number }
		}],
	rooms:[
		{
			roomID: { type: String, required: true },
		}],
	eventTypeID:{ type: String, required: [true, "Event type must be chosen"] },
	staffChosen:[
		{
			staffMemberID: { type: String, required: true },
			role: { type: String, required: true }
		}],
	date:{ type: Date, required: [true, "Event date must be provided"] },
	endDate: { type: Date },
	location: { type: String, required: [true, "Location of the event must be provided"] },
	visitors: [{
		visitorID: { type: String, required: true }
	}]
});

module.exports = mongoose.model("Event",EventSchema);