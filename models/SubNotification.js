const mongoose = require("mongoose");

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

module.exports = mongoose.model("SubNotification",SubNotificationSchema);