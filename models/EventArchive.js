const mongoose = require("mongoose");

let EventArchiveSchema = new mongoose.Schema({
	eventID:{ type: String, required: true },
	eventName:{ type: String, required: true },
	equipment:[
		{
			typeName: { type: String, required: true },
			reqQty: { type: Number },
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
			staffMemberID: { type:String, required: true },
			fullName: { type: String, required: true },
			email: { type: String, required: true },
			role: { type: String, required: true }
		}],
	date:{ type: Date, required: true },
	endDate: { type: Date },
	location: { type: String, required: true },
	numberOfSpaces: { type: Number, required: true },
	visitors: [{
		visitorID: { type: String, required: true },
		institutionName:{ type: String, required: true },
		groupSize:{ type: Number, required: true }
	}]
});

module.exports = mongoose.model("EventArchive",EventArchiveSchema);