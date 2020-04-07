const mongoose = require("mongoose");

var EventArchiveSchema = new mongoose.Schema({
	eventID:{ type: String, required: true },
	eventName:{ type: String, required: true },
	equipment:[
		{
			name: { type: String, required: true },
			quantity: { type: Number },
			customFields: [{
				fieldName: { type: String },
				fieldValue: { type: String }
			}]
		}],
	rooms:[
		{
			roomName: { type: String, required: true },
			capacity: { type: Number, required: true },
			customFields: [{
				fieldName: { type: String },
				fieldValue: { type: String }
			}]
		}],
	eventType:{ type: String, required: true },
	staffChosen:[
		{
			staffMemberName: { type: String, required: true },
			staffEmail: { type: String, required: true },
			role: { type: String, required: true }
		}],
	date:{ type: Date, required: true },
	endDate: { type: Date },
	location: { type: String, required: true },
	numberOfSpaces: { type: Number, required: true },
	numberOfVisitors: { type: Number, required: true }
});

module.exports = mongoose.model("EventArchive",EventArchiveSchema);