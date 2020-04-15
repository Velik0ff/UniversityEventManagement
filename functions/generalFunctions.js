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
	return new Promise((resolve) => {
		let event_equip_ids_arr = [];

		event_equipment.forEach((event_eq)=>{
			event_equip_ids_arr.push(event_eq.equipID);
		});

		Equipment.find({_id:{$in:event_equip_ids_arr}}, function (err, equipment) {
			if(!err){
				let equipment_used = [];
				event_equipment.forEach(function(equip_chosen){
					equipment.forEach(function(equip){
						if(equip_chosen.equipID.toString() === equip._id.toString()){
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
	return new Promise((resolve) => {
		let event_room_ids_arr = [];

		if(event_rooms) {
			event_rooms.forEach((event_room) => {
				event_room_ids_arr.push(event_room.roomID);
			});

			Room.find({_id: {$in: event_room_ids_arr}}, function (err, rooms) {
				if (!err) {
					resolve(rooms);
				} else {
					resolve([]);
					console.log(err);
				}
			});
		} else {
			resolve([]);
		}
	});
}

function getEventType(event_type_id){
	return new Promise((resolve) => {
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
	return new Promise((resolve) => {
		let staff_ids_arr = [];

		staff_chosen.forEach((staff)=>{
			staff_ids_arr.push(mongoose.Types.ObjectId(staff.staffMemberID));
		});

		Staff.find({_id:{$in:staff_ids_arr}}, {
			_id:1,
			fullName:1,
			email:1,
			phone:1,
			role:1,
			groupSize:1,
			attendingEvents:1
		}, function (err, staff) {
			if(!err){
				let staff_members = [];
				staff_chosen.forEach(function(staff_member_chosen){
					staff.forEach(function(staff_member){
						if(staff_member_chosen.staffMemberID.toString() === staff_member._id.toString()){
							staff_members.push(staff_member);
							staff_members[staff_members.length - 1]['staffMemberID'] = staff_member_chosen.staffMemberID;
							if(staff_member_chosen.role) {
								staff_members[staff_members.length - 1].role = staff_member_chosen.role;
							}
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
	return new Promise((resolve) => {
		let visitors_ids_arr = [];

		visitors.forEach((visitor)=>{
			visitors_ids_arr.push(mongoose.Types.ObjectId(visitor.visitorID))
		});

		Visitor.find({_id:{$in:visitors_ids_arr}}, {
			_id:1,
			leadTeacherName:1,
			institutionName:1,
			contactEmail:1,
			contactPhone:1,
			groupSize:1,
			attendingEvents:1,
			attendedEvents:1
		}, function (err, visitorsDoc) {
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
	return new Promise((resolve) => {
		Staff.find({}, {
			_id:1,
			fullName:1,
			email:1,
			phone:1,
			role:1,
			groupSize:1,
			attendingEvents:1
		}, function (err, staff) {
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
	return new Promise((resolve) => {
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
	return new Promise((resolve) => {
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
	return new Promise((resolve) => {
		Visitor.find({}, {
			_id:1,
			leadTeacherName:1,
			institutionName:1,
			contactEmail:1,
			contactPhone:1,
			groupSize:1,
			attendingEvents:1,
			attendedEvents:1
		}, function (err, visitors) {
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
	return new Promise((resolve) => {
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

	let info = null; // store the callback email data
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
					"You have been invited to participate in an event in University of Liverpool." +
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
					"<a href='" + link + "'>" + link + "</a></br></br>" +
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

function deleteEvent(id,type,archive){
	return new Promise(function(resolve,reject){
		switch(type){
			case "archive":
				Archive.deleteOne({_id: id}, function (err) {
					if (!err) {
						resolve("Successfully deleted event!");
					} else {
						console.log(err); // console log the error
						reject("Error while deleting event.");
					}
				});
				break;
			case "event-list":
				Event.findOne({_id: id}, async function (err, eventDoc) {
					if (!err && eventDoc) {
						let promises = [];
						let equipment_event = await getEquipmentInfo(eventDoc.equipment);
						let rooms_event = await getRoomInfo(eventDoc.rooms);
						let event_type = await getEventType(eventDoc.eventTypeID);
						let staff_event = await getStaffInfo(eventDoc.staffChosen);
						let visitors_event = await getVisitorInfo(eventDoc.visitors);
						let equipment = [];
						let rooms = [];
						let staff = [];
						let numberOfSpaces = 0;
						let visitorInfo = [];

						eventDoc.equipment.forEach(function (equip) {
							promises.push(new Promise((resold) => {
								Equipment.findOne({_id:equip.equipID},function(errFindEquip,equipFindDoc){
									if(!errFindEquip){
										Equipment.updateOne({_id: equip.equipID}, {$set: {quantity: equipFindDoc.quantity + equip.reqQty}}, function (errorUpdateEquip) {
											if(errorUpdateEquip) console.log(errorUpdateEquip);
											resold();
										});
									} else console.log(errFindEquip);
								});
							}));
						});

						eventDoc.rooms.forEach(function (room) {
							promises.push(new Promise((resold) => {
								Room.updateOne({_id: room.roomID}, {$pull: {events: {eventID: eventDoc._id}}}, function (errorUpdateRoom) {
									if(errorUpdateRoom) console.log(errorUpdateRoom);
									resold();
								});
							}));
						});

						eventDoc.staffChosen.forEach(function (staff_member_chosen) {
							promises.push(new Promise(function(resold) {
								Staff.updateOne({_id: staff_member_chosen.staffMemberID}, {$pull: {attendingEvents: {eventID: eventDoc._id}}}, function (errorUpdateStaff) {
									if(errorUpdateStaff) console.log(errorUpdateStaff);
									resold();
								});
							}));
						});

						eventDoc.visitors.forEach(function (visitor_attending) {
							promises.push(new Promise(function(resold) {
								Visitor.updateOne({_id: visitor_attending.visitorID}, {$pull: {attendingEvents: {eventID: eventDoc._id}}}, function (errorUpdateVisitor) {
									if(errorUpdateVisitor) console.log(errorUpdateVisitor);
									resold();
								});
							}));
						});

						Promise.all(promises).then(() => {
							equipment_event.forEach(function (equip) {
								equipment.push({
									typeName: equip.typeName,
									reqQty: equip.reqQty,
									customFields: equip.customFields
								});
							});

							rooms_event.forEach(function (room) {
								rooms.push({
									roomName: room.roomName,
									capacity: room.capacity,
									customFields: room.customFields
								});
							});

							staff_event.forEach(function (staff_member) {
								staff.push({
									staffMemberID:staff_member._id,
									fullName: staff_member.fullName,
									email: staff_member.email,
									role: staff_member.role
								});
							});

							rooms_event.forEach(function (room) { // count number of spaces
								numberOfSpaces = numberOfSpaces + room.capacity;
							});

							visitors_event.forEach(function (visitor) {
								Visitor.updateOne({_id:visitor._id},{$push:{attendedEvents:{
											eventID:id,
											institutionName:visitor.institutionName,
											groupSize:visitor.groupSize}}},{multi:true},function(errUpdateVisitors) {
									if (errUpdateVisitors) console.log(errUpdateVisitors);

									Visitor.update({_id: visitor._id}, {$pull: {attendingEvents: {eventID: id}}}, {multi: true}, function (errUpdatePullVisitors) {
										if (errUpdatePullVisitors) console.log(errUpdatePullVisitors);
									});
								});

								visitorInfo.push({
									visitorID:visitor._id,
									institutionName:visitor.institutionName,
									groupSize:visitor.groupSize
								});
							});

							if(archive) {
								archiveEvent(eventDoc, equipment, rooms, event_type, staff, numberOfSpaces, visitorInfo).then(function () {
									Event.deleteOne({_id: id}, function (err) {
										if (!err) {
											resolve("Successfully deleted event!")
										} else {
											console.log(err); // console log the error
											reject("Error while deleting event.");
										}
									});
								}).catch(function () {
									reject("Error while archiving event.");
								});
							}
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

function archiveEvent(event,equipment,rooms,event_type,staff,numberOfSpaces,visitorInfo){
	return new Promise(function(resolve,reject){
		let new_archive_event = new Archive({
			eventID: event._id,
			eventName: event.eventName,
			equipment: equipment,
			rooms: rooms,
			eventType: event_type.eventTypeName,
			staffChosen: staff,
			date: event.date,
			endDate: event.endDate,
			location: event.location,
			numberOfSpaces: numberOfSpaces,
			visitors: visitorInfo
		});

		new_archive_event.save(function (errSave) {
			if (!errSave) {
				resolve();
			} else {
				console.log(errSave);
				reject();
			}
		});
	});
}

async function archiveEvents() {
	Event.find({}, null, {sort: {date: -1}}, function (err, eventDoc) {
		if (!err) {
			if (eventDoc) {
				let today = Date.now();

				if(eventDoc.length > 0) {
					if ((eventDoc[0].endDate && Date.parse(eventDoc[0].endDate) < today) ||
						(!eventDoc[0].endDate && eventDoc[0].date && Date.parse(eventDoc[0].date) < today)) {

						eventDoc.forEach(async function (event) {
							if ((event.endDate && Date.parse(event.endDate) < today) ||
								(!event.endDate && event.date && Date.parse(event.date) < today)) {
								deleteEvent(event._id, "event-list",true).then().catch();
							}
						});
					}
				}
			}
		} else {
			console.log(err);
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
	deleteEvent:deleteEvent,
	archiveEvents:archiveEvents
};