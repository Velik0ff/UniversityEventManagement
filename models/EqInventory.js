/**
 * Author: Lyuboslav Velikov
 * ID: 201186573
 * University of Liverpool
 * This file is used to define the structure of the equipment
 * before inserting the entity into the database
 * @type {createApplication} is the main route handler (router)
 */

const mongoose = require("mongoose");

/* Create the schema to be followed */
let EqInventorySchema = new mongoose.Schema({
	typeName: { type: String, required: [true, "Equipment name must be stated"] },
	quantity: { type: Number, required: [true, "Quantity of the equipment must be stated"] },
	customFields: [{
		fieldName: { type: String },
		fieldValue: { type: String }
	}]
});
/* End Create the schema to be followed */

module.exports = mongoose.model("Equipment",EqInventorySchema); // export the schema