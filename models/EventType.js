const mongoose = require("mongoose");

var EventTypeSchema = new mongoose.Schema({
	eventTypeName: { type: String, required: [true, "Event type name must be provided"] },
	customFields: [{
		fieldName: { type: String },
		fieldValue: { type: String }
	}]
});

module.exports = mongoose.model("EventType",EventTypeSchema);