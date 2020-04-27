/**
 * Author: Lyuboslav Velikov
 * ID: 201186573
 * University of Liverpool
 * This file is used to define the structure of the event
 * before inserting the entity into the database
 * @type {createApplication} is the main route handler (router)
 */
const mongoose = require("mongoose");

/* Create the schema to be followed */
let EventSchema = new mongoose.Schema({
	eventName:{ type: String, required: [true, "Event name must be provided"] },
	eventDescription: { type: String },
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
/* End Create the schema to be followed */

module.exports = mongoose.model("Event",EventSchema); // export the schema