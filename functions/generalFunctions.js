const webpush = require('web-push');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const smtp = require('../functions/smtp');

/* Model */
const EventType = require('../models/EventType');
const Equipment = require('../models/EqInventory');
const Staff = require('../models/staff_user');
const Visitor = require('../models/visitor_user');
const Room = require('../models/Room');
const SubNotification = require('../models/SubNotification');
const Archive = require('../models/EventArchive');
const Event = require('../models/Event');
/* End Model */

function getEquipmentInfo(event_equipment){
	return new Promise((resolve,reject) => {
		var event_equip_ids_arr = [];

		event_equipment.forEach((event_eq)=>{
			event_equip_ids_arr.push(event_eq.equipID);
		});

		Equipment.find({_id:{$in:event_equip_ids_arr}}, function (err, equipment) {
			if(!err){
				let equipment_used = [];
				event_equipment.forEach(function(equip_chosen){
					equipment.forEach(function(equip){
						if(equip_chosen.equipID == equip._id){
							equipment_used.push({
								_id:equip._id,
								typeName: equip.typeName,
								quantity: equip.quantity,
								reqQty: equip_chosen.reqQty,
								customFields: equip.customFields
							});
						}
					});
				});
				resolve(equipment_used)
			} else {
				resolve([]);
				console.log(err);
			}
		});
	});
}

function getRoomInfo(event_rooms){
	return new Promise((resolve,reject) => {
		var event_room_ids_arr = [];

		event_rooms.forEach((event_room)=>{
			event_room_ids_arr.push(event_room.roomID);
		});

		Room.find({_id:{$in:event_room_ids_arr}}, function (err, rooms) {
			if(!err){
				resolve(rooms);
			} else {
				resolve([]);
				console.log(err);
			}
		});
	});
}

function getEventType(event_type_id){
	return new Promise((resolve,reject) => {
		EventType.findOne({_id:event_type_id}, function (err, event_type) {
			if(!err){
				resolve(event_type);
			} else {
				resolve(event_type);
				console.log(err);
			}
		});
	});
}

function getStaffInfo(staff_chosen){
	return new Promise((resolve,reject) => {
		var staff_ids_arr = [];

		staff_chosen.forEach((staff)=>{
			staff_ids_arr.push(mongoose.Types.ObjectId(staff.staffMemberID));
		});

		Staff.find({_id:{$in:staff_ids_arr}}, function (err, staff) {
			if(!err){
				let staff_members = [];
				staff_chosen.forEach(function(staff_member_chosen){
					staff.forEach(function(staff_member){
						if(staff_member_chosen.staffMemberID == staff_member._id){
							staff_members.push(staff_member);
							staff_members[staff_members.length-1].role = staff_member_chosen.role;
						}
					});
				});
				resolve(staff_members);
			} else {
				resolve([]);
				console.log(err);
			}
		});
	});
}

function getVisitorInfo(visitors){
	return new Promise((resolve,reject) => {
		var visitors_ids_arr = [];

		visitors.forEach((visitor)=>{
			visitors_ids_arr.push(mongoose.Types.ObjectId(visitor.visitorID))
		});

		Visitor.find({_id:{$in:visitors_ids_arr}}, function (err, visitorsDoc) {
			if(!err){
				resolve(visitorsDoc);
			} else {
				resolve(visitorsDoc);
				console.log(err);
			}
		});
	});
}

function getAllStaff(){
	return new Promise((resolve,reject) => {
		Staff.find({}, function (err, staff) {
			if(!err){
				resolve(staff)
			} else {
				resolve([]);
				console.log(err);
			}
		});
	});
}

function getAllEquipment(){
	return new Promise((resolve,reject) => {
		Equipment.find({}, function (err, equipment) {
			if(!err){
				resolve(equipment)
			} else {
				resolve([]);
				console.log(err);
			}
		});
	});
}

function getAllRooms(){
	return new Promise((resolve,reject) => {
		Room.find({}, function (err, rooms) {
			if(!err){
				resolve(rooms)
			} else {
				resolve([]);
				console.log(err);
			}
		});
	});
}

function getAllVisitor(){
	return new Promise((resolve,reject) => {
		Visitor.find({}, function (err, visitors) {
			if(!err){
				resolve(visitors);
			} else {
				resolve(visitors);
				console.log(err);
			}
		});
	});
}

function getAllEventTypes(){
	return new Promise((resolve,reject) => {
		EventType.find({}, function (err, event_types) {
			if(!err){
				resolve(event_types);
			} else {
				resolve(event_types);
				console.log(err);
			}
		});
	});
}

function sendNotification(userID,title,body){
	SubNotification.findOne({userID:userID},function(errFind,subNotifDoc){
		if(!errFind && subNotifDoc){
			const payload = JSON.stringify({
        title: title,
        body: body
   		});

			webpush.sendNotification(subNotifDoc.notification, payload);
		} else {
			console.log(errFind);
		}
	});
}

async function sendEmail(email, password, role, reset_code, req, type) {
	// Generate test SMTP service account from ethereal.email
	// Only needed if you don't have a real mail account for testing
	// let testAccount = await nodemailer.createTestAccount();

	// create reusable transporter object using the default SMTP transport
	let transporter = nodemailer.createTransport({
		host: smtp.host,
		// host: "smtp.ethereal.email",
		port: 587,
		secure: false, // true for 465, false for other ports
		auth: {
			// user: testAccount.user,
			// pass: testAccount.pass
			user: smtp.user,
			pass: smtp.pass
		}
	});

	var info = null; // store the callback email data
	// send mail with defined transport object
	switch (type) {
		case "added":
			info = await transporter.sendMail({
				from: '"University of Liverpool Event System" <postmaster@mail.uol-events.co.uk>', // sender address
				to: email, // list of receivers
				subject: "You have been invited to participate in an event", // Subject line
				html: "Hello,</br></br>" +
					"You have been added as a participant to an event." +
					"<p>Please visit the University of Liverpool Event System to view the list of events you are a participant.</p>" +
					"Best regards,</br>" +
					"UOL Computer Science outreach staff."
			});
			break;
		case "edited":
			info = await transporter.sendMail({
				from: '"University of Liverpool Event System" <no-reply@uol-events.co.uk>', // sender address
				to: email, // list of receivers
				subject: "An event has been edited", // Subject line
				html: "Hello,</br></br>" +
					"An event that you are participating to has been updated." +
					"<p>Please visit the University of Liverpool Event System to view the list of events you are a participant.</p>" +
					"Best regards,</br>" +
					"UOL Computer Science outreach staff."
			});
			break;
		case "removed":
			info = await transporter.sendMail({
				from: '"University of Liverpool Event System" <no-reply@uol-events.co.uk>', // sender address
				to: email, // list of receivers
				subject: "You have been removed as a participant to an event.", // Subject line
				html: "Hello,</br></br>" +
					"You have been removed from an event that you were going to participate." +
					"<p>Please visit the University of Liverpool Event System to view the list of events you are a participant.</p>" +
					"Best regards,</br>" +
					"UOL Computer Science outreach staff."
			});
			break;
		case "staff":
			info = await transporter.sendMail({
				from: '"University of Liverpool Event System" <no-reply@uol-events.co.uk>', // sender address
				to: email, // list of receivers
				subject: "You have been invited to be a staff member", // Subject line
				html: "Hello,</br></br>" +
					"You have been invited to be a staff member with role: <b>" + role +
					"</b></br>" +
					"Your username is this email: <b>" + email +
					"</b></br>" +
					"The automatic password generated by the system is: <b>" + password +
					"</b></br><b>You will be prompted to change this password upon first login!</b></br>" +
					"</br><b>If you think that this email should not be sent to you, please ignore it or report back to: sglvelik@liv.ac.uk</b>"// html body
			});
			break;
		case "visitor":
			info = await transporter.sendMail({
				from: '"University of Liverpool Event System" <no-reply@uol-events.co.uk>', // sender address
				to: email, // list of receivers
				subject: "You have been invited to an event", // Subject line
				html: "Hello,</br></br>" +
					"You have been invited to participate in an event in University of Liverpool. <br>" +
					"</br></br>" +
					"Your username is this email: <b>" + email +
					"</b></br>" +
					"The automatic password generated by the system is: <b>" + password +
					"</br><b>If you think that this email should not be sent to you, please ignore it or report back to: sglvelik@liv.ac.uk</b>"// html body
			});
			break;
		case "reset-pass":
			info = await transporter.sendMail({
				from: '"University of Liverpool Event System" <no-reply@uol-events.co.uk>', // sender address
				to: email, // list of receivers
				subject: "Your password has been reset", // Subject line
				html: "Hello,</br></br>" +
					"Your password for the event management portal has been reset." +
					"</br></br>" +
					"Your new automatically generated password is: <b>" + password +
					"</b></br>" +
					"</br><b>If you think that this email should not be sent to you, please ignore it or report back to: sglvelik@liv.ac.uk</b>"// html body
			});
			break;
		case "forgot-pass":
			let link = req.protocol + '://' + req.get('host') + '/change-password?reset_code=' + reset_code;

			info = await transporter.sendMail({
				from: '"University of Liverpool Event System" <no-reply@uol-events.co.uk>', // sender address
				to: email, // list of receivers
				subject: "Reset Password", // Subject line
				html: "Hello,</br></br>" +
					"Your password reset link is:</br>" +
					"<a href='" + link + "'>" + link + "</a></br>" +
					"<b>If you have not requested this email, please ignore it.</b>" +
					"<p>" +
					"Best regards,</br>" +
					"UOL Computer Science outreach staff." +
					"</p>"
			});
			break;
	}

	// console.log(info);

	// console.log("Message sent: %s", info.messageId);
	// Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

	// Preview only available when sending through an Ethereal account
	// console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
	// Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

function deleteEvent(id,type){
	return new Promise(function(resolve,reject){
		switch(type){
			case "archive":
				Archive.deleteOne({_id: id}, function (err, deleteResult) {
					if (!err) {
						resolve("Successfully deleted event!")
					} else {
						console.log(err); // console log the error
						reject("Error while deleting event.");
					}
				});
				break;
			case "event-list":
				Event.findOne({_id: id}, function (err, eventDoc) {
					if (!err && eventDoc) {
						var promises = [];

						eventDoc.equipment.forEach(function (equip) {
							promises.push(new Promise((resolve, reject) => {
								Equipment.updateOne({_id: equip.equipID}, {$set: {quantity: equip.quantity + equip.reqQty}}, function (errorUpdateEquip, equipDoc) {
									if(errorUpdateEquip) console.log(errorUpdateEquip);
									resolve();
								});
							}));
						});

						eventDoc.rooms.forEach(function (room) {
							promises.push(new Promise((resolve, reject) => {
								Room.updateOne({_id: room.roomID}, {$pull: {events: {eventID: eventDoc._id}}}, function (errorUpdateRoom, roomDoc) {
									if(errorUpdateRoom) console.log(errorUpdateRoom);
									resolve();
								});
							}));
						});

						eventDoc.staffChosen.forEach(function (staff_member_chosen) {
							promises.push(new Promise((resolve, reject) => {
								Staff.updateOne({_id: staff_member_chosen.staffMemberID}, {$pull: {attendingEvents: {eventID: eventDoc._id}}}, function (errorUpdateStaff, staffDoc) {
									if(errorUpdateStaff) console.log(errorUpdateStaff);
									resolve();
								});
							}));
						});

						eventDoc.visitors.forEach(function (visitor_attending) {
							promises.push(new Promise((resolve, reject) => {
								Visitor.updateOne({_id: visitor_attending.visitorID}, {$pull: {attendingEvents: {eventID: eventDoc._id}}}, function (errorUpdateVisitor, visitorDoc) {
									if(errorUpdateVisitor) console.log(errorUpdateVisitor);
									resolve();
								});
							}));
						});

						Promise.all(promises).then(() => {
							Event.deleteOne({_id: id}, function (err, deleteResult) {
								if (!err) {
									resolve("Successfully deleted event!")
								} else {
									console.log(err); // console log the error
									reject("Error while deleting event.");
								}
							});
						});
					} else {
						console.log(err); // console log the error
						reject("Event not found.");
					}
				});
				break;
		}
	});
}

module.exports = {
	getEquipmentInfo:getEquipmentInfo,
	getRoomInfo:getRoomInfo,
	getEventType:getEventType,
	getStaffInfo:getStaffInfo,
	getVisitorInfo:getVisitorInfo,
	getAllStaff:getAllStaff,
	getAllEquipment:getAllEquipment,
	getAllRooms:getAllRooms,
	getAllVisitor:getAllVisitor,
	getAllEventTypes:getAllEventTypes,
	sendNotification:sendNotification,
	sendEmail:sendEmail,
	deleteEvent:deleteEvent
}