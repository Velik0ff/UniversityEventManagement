/**
 * Author: Lyuboslav Velikov
 * ID: 201186573
 * University of Liverpool
 * This file is used to define the structure of the room
 * before inserting the entity into the database
 * @type {createApplication} is the main route handler (router)
 */

const mongoose = require("mongoose");

/* Create the schema to be followed */
let RoomSchema = new mongoose.Schema({
	roomName: { type: String, required: [true, "Room name must be stated"] },
	capacity: { type: Number, required: [true, "Room capacity must be stated"] },
	events:[{
		eventID: { type: String, required: true },
		eventName: { type: String, required: true },
		date: { type: Date, required: true },
		endDate: { type: Date }
	}],
	customFields: [{
		fieldName: { type: String },
		fieldValue: { type: String }
	}]
});
/* End Create the schema to be followed */

module.exports = mongoose.model("Room",RoomSchema); // export the schema