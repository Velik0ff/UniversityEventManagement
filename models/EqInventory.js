const mongoose = require("mongoose");

var EqInventorySchema = new mongoose.Schema({
	typeName: { type: String, required: [true, "Equipment name must be stated"] },
	quantity: { type: String, required: [true, "Quantity of the equipment must be stated"] },
	customFields: [{
		fieldName: { type: String },
		fieldValue: { type: String }
	}]
});

module.exports = mongoose.model("Equipment",EqInventorySchema);