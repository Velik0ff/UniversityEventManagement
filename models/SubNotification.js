/**
 * Author: Lyuboslav Velikov
 * ID: 201186573
 * University of Liverpool
 * This file is used to define the structure of the subscription (for push notifications)
 * before inserting the entity into the database
 * @type {createApplication} is the main route handler (router)
 */

const mongoose = require("mongoose");

/* Create the schema to be followed */
let SubNotificationSchema = new mongoose.Schema({
	userID: { type: String, required: true },
	notification: {
		endpoint: { type: String },
		expiration: { type: String },
		keys:{
			p256dh: { type: String },
			auth: { type: String }
		}
	}
});
/* End Create the schema to be followed */

module.exports = mongoose.model("SubNotification",SubNotificationSchema); // export the schema