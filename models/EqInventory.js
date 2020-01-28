const mongoose = require("mongoose");

var EqInventorySchema = new mongoose.Schema({
	typeName: { type: String, required: true },
	quantity: { type: String, required: true },
	customFields: [{
		fieldName: { type: String },
		fieldValue: { type: String }
	}]
});

module.exports = mongoose.model("Equipment",EqInventorySchema);