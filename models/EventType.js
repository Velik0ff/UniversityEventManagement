const mongoose = require("mongoose");

var EventTypeSchema = new mongoose.Schema({
	eventTypeName: { type: String, required: true },
	customFields: [{
		fieldName: { type: String },
		fieldValue: { type: String }
	}]
});

module.exports = mongoose.model("EventType",EventTypeSchema);