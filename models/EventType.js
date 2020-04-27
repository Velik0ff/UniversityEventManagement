/**
 * Author: Lyuboslav Velikov
 * ID: 201186573
 * University of Liverpool
 * This file is used to define the structure of the event type
 * before inserting the entity into the database
 * @type {createApplication} is the main route handler (router)
 */

const mongoose = require("mongoose");

/* Create the schema to be followed */
let EventTypeSchema = new mongoose.Schema({
	eventTypeName: { type: String, required: [true, "Event type name must be provided"] },
	customFields: [{
		fieldName: { type: String },
		fieldValue: { type: String }
	}]
});
/* End Create the schema to be followed */

module.exports = mongoose.model("EventType",EventTypeSchema); // export the schema