/**
 * Author: Lyuboslav Velikov
 * ID: 201186573
 * University of Liverpool
 * The file includes general functions which are used for other components when required
 * @type {{supportedContentEncodings, WebPushError, encrypt, getVapidHeaders, setGCMAPIKey, setVapidDetails, sendNotification, generateRequestDetails, generateVAPIDKeys}|*}
 * is exporting all the required functions by other components outside of this file
 */

const webpush = require('web-push'); // web push package for Push Notifications
const mongoose = require('mongoose'); // MongoDB package for the database queries
const nodemailer = require('nodemailer'); // package to handle emails
const smtp = require('../functions/smtp'); // SMTP details for the emailing service

/* Models */
const EventType = require('../models/EventType'); // Event Type Model
const Equipment = require('../models/EqInventory'); // Equipment Model
const Staff = require('../models/staff_user'); // Staff User Model
const Visitor = require('../models/visitor_user'); // Visitor User Model
const Room = require('../models/Room'); // Room Model
const SubNotification = require('../models/SubNotification'); // Notifications Model
const Archive = require('../models/EventArchive'); // Archive Events Model
const Event = require('../models/Event'); // Event Model
/* End Models */

/**
 * This function gets the information about the equipment ids that are passed
 * @param event_equipment is the array of event equipment with the information about it
 * @returns {Promise<Array>} When resolve it will return an array with the information
 */
function getEquipmentInfo(event_equipment){
	return new Promise((resolve) => {
		let event_equip_ids_arr = []; // array to store the equipment ids

		/* Save the ids to the temporary array */
		event_equipment.forEach((event_eq)=>{
			event_equip_ids_arr.push(event_eq.equipID);
		});
		/* End Save the ids to the temporary array */

		Equipment.find({_id:{$in:event_equip_ids_arr}}, function (err, equipment) { // find all equipment requested
			if(!err){
				let equipment_used = []; // array to store the equipment information
				event_equipment.forEach(function(equip_chosen){ // iterate through the equipment requested
					equipment.forEach(function(equip){ // iterate through the found equipment from the database
						if(equip_chosen.equipID.toString() === equip._id.toString()){ // if the equipment is found in the database
							equipment_used.push({ // add the equipment info to the array
								_id:equip._id,
								typeName: equip.typeName,
								quantity: equip.quantity,
								reqQty: equip_chosen.reqQty,
								customFields: equip.customFields
							});
						}
					});
				});
				resolve(equipment_used); // resolve with the array of equipment info
			} else {
				resolve([]); // resolve with empty array because of error
				console.log(err);
			}
		});
	});
}

/**
 * This function gets the information about the room ids that are passed
 * @param event_rooms is the array of event room with the information about it
 * @returns {Promise<Array>} When resolve it will return an array with the information
 */
function getRoomInfo(event_rooms){
	return new Promise((resolve) => {
		let event_room_ids_arr = []; // array to store the room ids

		if(event_rooms) { // check if something has been requested to this function
			/* Save the ids to the temporary array */
			event_rooms.forEach((event_room) => {
				event_room_ids_arr.push(event_room.roomID);
			});
			/* End Save the ids to the temporary array */

			Room.find({_id: {$in: event_room_ids_arr}}, function (err, rooms) { // find all rooms requested
				if (!err) {
					resolve(rooms); // resolve with the array of room info
				} else {
					resolve([]); // resolve with empty array because of error
					console.log(err);
				}
			});
		} else {
			resolve([]); // return empty array because nothing was requested
		}
	});
}

/**
 * This function gets the information about the event type id that is passed
 * @param event_type_id is the id of event type with the information about it
 * @returns {Promise<Object>} When resolve it will return the information
 */
function getEventType(event_type_id){
	return new Promise((resolve) => {
		EventType.findOne({_id:event_type_id}, function (err, event_type) { // find event type requested
			if(!err){
				resolve(event_type); // resolve with the information of the event type
			} else {
				resolve(event_type); // this will resolve with null
				console.log(err);
			}
		});
	});
}

/**
 * This function gets the information about the staff ids that are passed
 * @param staff_chosen The array of ids of staff members that information is requested for them
 * @returns {Promise<Array>} When resolve it will return an array with the information
 */
function getStaffInfo(staff_chosen){
	return new Promise((resolve) => {
		let staff_ids_arr = []; // array to store the staff member ids

		/* Save the ids to the temporary array */
		staff_chosen.forEach((staff)=>{
			staff_ids_arr.push(mongoose.Types.ObjectId(staff.staffMemberID));
		});
		/* End Save the ids to the temporary array */

		Staff.find({_id:{$in:staff_ids_arr}}, { // find all staff requested
			_id:1,
			fullName:1,
			email:1,
			phone:1,
			role:1,
			groupSize:1,
			attendingEvents:1
		}, function (err, staff) {
			if(!err){
				let staff_members = []; // array to store the staff member information
				staff_chosen.forEach(function(staff_member_chosen){ // iterate through the staff members requested
					staff.forEach(function(staff_member){ // iterate through the found staff members from the database
						if(staff_member_chosen.staffMemberID.toString() === staff_member._id.toString()){ // if the staff member is found in the database
							staff_members.push(staff_member); // add the staff member to the database
							staff_members[staff_members.length - 1]['staffMemberID'] = staff_member_chosen.staffMemberID; // add staffMemberID field, needed in some templates
							if(staff_member_chosen.role) { // if staff member has a custom role for an event
								staff_members[staff_members.length - 1].role = staff_member_chosen.role; // assign the custom role to be displayed
							}
						}
					});
				});
				resolve(staff_members); // resolve with the array of staff member info
			} else {
				resolve([]); // resolve with empty array because of error
				console.log(err);
			}
		});
	});
}

/**
 * This function gets the information about the visitor ids that are passed
 * @param visitors The array of ids of visitors  that information is requested for them
 * @returns {Promise<Array>} When resolve it will return an array with the information
 */
function getVisitorInfo(visitors){
	return new Promise((resolve) => {
		let visitors_ids_arr = []; // array to store the visitor ids

		/* Save the ids to the temporary array */
		visitors.forEach((visitor)=>{
			visitors_ids_arr.push(mongoose.Types.ObjectId(visitor.visitorID))
		});
		/* End Save the ids to the temporary array */

		Visitor.find({_id:{$in:visitors_ids_arr}}, { // find all visitors requested
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
				resolve(visitorsDoc); // resolve with the array of visitor info
			} else {
				resolve(visitorsDoc); // this will resolve with empty array because of error
				console.log(err);
			}
		});
	});
}

/**
 * This function gets all the staff members from the database with the information
 * @returns {Promise<Array>}
 */
function getAllStaff(){
	return new Promise((resolve) => {
		// Only certain fields are chosen, for example we do not need "password" here, that is why it is not picked
		Staff.find({}, { // get all staff members from the database
			_id:1,
			fullName:1,
			email:1,
			phone:1,
			role:1,
			groupSize:1,
			attendingEvents:1,
			permission:1
		}, function (err, staff) {
			if(!err){
				resolve(staff); // resolve with the array of staff members
			} else {
				resolve([]); // empty array because of error
				console.log(err);
			}
		});
	});
}

/**
 * This function gets all the equipment from the database with the information
 * @returns {Promise<Array>}
 */
function getAllEquipment(){
	return new Promise((resolve) => {
		Equipment.find({}, function (err, equipment) { // get all the equipment from the database
			if(!err){
				resolve(equipment); // resolve with the array of the equipment
			} else {
				resolve([]); // empty array because of error
				console.log(err);
			}
		});
	});
}

/**
 * This function gets all the rooms from the database with the information
 * @returns {Promise<Array>}
 */
function getAllRooms(){
	return new Promise((resolve) => {
		Room.find({}, function (err, rooms) { // get all the rooms from the database
			if(!err){
				resolve(rooms); // resolve with the array of the rooms
			} else {
				resolve([]); // empty array because of error
				console.log(err);
			}
		});
	});
}

/**
 * This function gets all the visitors from the database with the information
 * @returns {Promise<Array>}
 */
function getAllVisitor(){
	return new Promise((resolve) => {
		// Only certain fields are chosen, for example we do not need "password" here, that is why it is not picked
		Visitor.find({}, { // get all the visitors from the database
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
				resolve(visitors); // resolve with the array of the visitors
			} else {
				resolve(visitors); // empty array because of error
				console.log(err);
			}
		});
	});
}

/**
 * This function gets all the event types from the database with the information
 * @returns {Promise<Array>}
 */
function getAllEventTypes(){
	return new Promise((resolve) => {
		EventType.find({}, function (err, event_types) { // get all the event types from the database
			if(!err){
				resolve(event_types); // resolve with the array of event types
			} else {
				resolve(event_types); // empty array because of error
				console.log(err);
			}
		});
	});
}

/**
 * This function notifies all the staff members for approaching events
 */
function notifyForApproachingEvents(){
	Event.find({}, null, {sort: {date: -1}}, function (err, events) { // get all the events from the database
		if(!err){
			let one_week = 60 * 60 * 1000 * 24 * 7; // one week in milliseconds
			let one_week_from_now = Date.parse((new Date)) + one_week; // get time in milliseconds in one week from now

			if(events){ // if found any events in the database
				let staff_notify = []; // array of staff emails to be notified via email
				let staff_notify_ids = []; // array of staff ids to be notified via notifications
				let promises = []; // store the promises that need to be executed before sending anything

				/* Iterate through all the events */
				events.forEach(function(event){
					let event_date = Date.parse(event.date); // get the event date in milliseconds
					let staff_helpers = []; // store the staff helpers in an array

					/* Iterate through the staff members chosen for event */
					event.staffChosen.forEach(function(staff_member){
						if(staff_member.role === "Student Helper") staff_helpers.push(staff_member);
					});
					/* End Iterate through the staff members chosen for event */

					// check if an event is less than a week ago and does not have any Student Helpers
					if(event_date < one_week_from_now && staff_helpers.length === 0){
						promises.push(new Promise(function(resolve){
							getAllStaff().then(function(staff_members){ // get all staff members
								staff_members.forEach(function(staff_member){ // iterate through all staff members
									if(staff_member.permission >= 10 && !staff_notify.includes(staff_member.email)){ // check if they are registered
										staff_notify.push(staff_member.email); // add to array with staff members to be notified
										staff_notify_ids.push(staff_member._id); // add to arra with staff members ids to be notified
									}
								});

								resolve(); // resolve the promise
							});
						}));
					}
				});
				/* End Itearate through all the events */

				/* Send Notifications */
				Promise.all(promises).then(function(){ // when all promises are resolved
					/* Send Email Notifications */
					staff_notify.forEach(function(staff_member){ // iterate through staff members to be notified array
						sendEmail(staff_member, null, null, null, null, "approaching").then().catch(); // send email
					});
					/* End Send Email Notifications */

					/* Send Push Notifications */
					staff_notify_ids.forEach(function(staff_member_id){
						sendNotification(staff_member_id,"Event Approaching","An event without a Staff Helper is approaching.");
					});
					/* End Send Push Notifications */
				});
				/* End Send Notifications */
			}
		} else { // error while searching for events in database
			console.log(err);
		}
	});
}

/**
 * This function will send a notification to a user
 * that has signed into the system at least once
 * @param userID The user id which has to receive a push notification
 * @param title Title of the notification
 * @param body The body of the notification
 */
function sendNotification(userID,title,body){
	SubNotification.findOne({userID:userID},function(errFind,subNotifDoc){ // find the subscription in the database
		if(!errFind && subNotifDoc){
			const payload = JSON.stringify({ // create the payload for the notification
        title: title,
        body: body
   		});

			webpush.sendNotification(subNotifDoc.notification, payload); // send the notification
		} else { // error or subscription not found
			console.log(errFind);
		}
	});
}

/**
 * This function will send an email to a user email
 * depending on the type that the system has to send.
 * @param email The email of the user
 * @param password The password that has to be sent
 * @param role The role of the user
 * @param reset_code The reset code that is used to recover the password
 * @param req The request that has been made
 * @param type The type of the email that has to be sent
 * @returns {Promise<void>}
 */
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
			info = await transporter.sendMail({ // send the email
				from: '"University of Liverpool Event System" <postmaster@mail.uol-events.co.uk>', // sender address
				to: email, // receiver
				subject: "You have been invited to participate in an event", // Subject line
				html: "Hello,</br></br>" +
					"You have been added as a participant to an event." +
					"<p>Please visit the University of Liverpool Event System to view the list of events you are a participant.</p>" +
					"Best regards,</br>" +
					"UOL Computer Science outreach staff."
			});
			break;
		case "edited":
			info = await transporter.sendMail({ // send the email
				from: '"University of Liverpool Event System" <no-reply@uol-events.co.uk>', // sender address
				to: email, // receiver
				subject: "An event has been edited", // Subject line
				html: "Hello,</br></br>" +
					"An event that you are participating to has been updated." +
					"<p>Please visit the University of Liverpool Event System to view the list of events you are a participant.</p>" +
					"Best regards,</br>" +
					"UOL Computer Science outreach staff."
			});
			break;
		case "removed":
			info = await transporter.sendMail({ // send the email
				from: '"University of Liverpool Event System" <no-reply@uol-events.co.uk>', // sender address
				to: email, // receiver
				subject: "You have been removed as a participant to an event.", // Subject line
				html: "Hello,</br></br>" +
					"You have been removed from an event that you were going to participate." +
					"<p>Please visit the University of Liverpool Event System to view the list of events you are a participant.</p>" +
					"Best regards,</br>" +
					"UOL Computer Science outreach staff."
			});
			break;
		case "approaching":
			info = await transporter.sendMail({ // send the email
				from: '"University of Liverpool Event System" <postmaster@mail.uol-events.co.uk>', // sender address
				to: email, // receiver
				subject: "An event does not have any student helpers", // Subject line
				html: "Hello,</br></br>" +
					"One or more event is approaching <u>without a student helper.</u>" +
					"<p>Please visit the University of Liverpool Event System to view the list of events that are approaching.</p>" +
					"Best regards,</br>" +
					"UOL Computer Science outreach staff."
			});
			break;
		case "staff":
			info = await transporter.sendMail({ // send the email
				from: '"University of Liverpool Event System" <no-reply@uol-events.co.uk>', // sender address
				to: email, // receiver
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
			info = await transporter.sendMail({ // send the email
				from: '"University of Liverpool Event System" <no-reply@uol-events.co.uk>', // sender address
				to: email, // receiver
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
			info = await transporter.sendMail({ // send the email
				from: '"University of Liverpool Event System" <no-reply@uol-events.co.uk>', // sender address
				to: email, // receiver
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

			info = await transporter.sendMail({ // send the email
				from: '"University of Liverpool Event System" <no-reply@uol-events.co.uk>', // sender address
				to: email, // receiver
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

/**
 * This function will delete an event from the events collection
 * and will archive the event information and store it in the database
 * or it will delete the event from the archive collection
 * @param id The event id which has to be deleted and archived
 * @param type Type of the deletion, if it deletes from archive it deletes only without archiving
 * @param archive
 * @returns {Promise<any>}
 */
function deleteEvent(id,type,archive){
	return new Promise(function(resolve,reject){
		switch(type){
			case "archive":
				Archive.deleteOne({eventID: id}, function (err) { // delete archive event from the database
					if (!err) {
						resolve("Successfully deleted event!"); // resolve with success message
					} else {
						console.log(err); // console log the error
						reject("Error while deleting event."); // reject with error message (handled in catch)
					}
				});
				break;
			case "event-list":
				Event.findOne({_id: id}, async function (err, eventDoc) { // find the event information
					if (!err && eventDoc) {
						let promises = []; // store all the promises that have to be resolved
						let equipment_event = await getEquipmentInfo(eventDoc.equipment); // get the equipment info of the event
						let rooms_event = await getRoomInfo(eventDoc.rooms); // get the room info of the event
						let event_type = await getEventType(eventDoc.eventTypeID); // get the event type info of the event
						let staff_event = await getStaffInfo(eventDoc.staffChosen); // get the staff member info of the event
						let visitors_event = await getVisitorInfo(eventDoc.visitors); // get the visitor info of the event
						let equipment = []; // store the equipment info needed to be inserted for the archive
						let rooms = []; // store the room info needed to be inserted for the archive
						let staff = []; // store the staff member info needed to be inserted for the archive
						let numberOfSpaces = 0; // the number of spaces of the event
						let visitorInfo = []; // store the visitor info needed to be inserted for the archive

						/* Update the equipment quantity */
						eventDoc.equipment.forEach(function (equip) { // iterate through event equipment
							promises.push(new Promise((resold) => {
								Equipment.findOne({_id:equip.equipID},function(errFindEquip,equipFindDoc){ // find the equipment
									if(!errFindEquip){
										// increment the equipment quantity
										Equipment.updateOne({_id: equip.equipID}, {$set: {quantity: equipFindDoc.quantity + equip.reqQty}}, function (errorUpdateEquip) {
											if(errorUpdateEquip) console.log(errorUpdateEquip);
											resold(); // resolve inner promise (stored in the promises array)
										});
									} else console.log(errFindEquip);
								});
							}));
						});
						/* End Update the equipment quantity */

						/* Update the room availability */
						eventDoc.rooms.forEach(function (room) { // iterate through event rooms
							promises.push(new Promise((resold) => {
								// remove the event from the room events
								Room.updateOne({_id: room.roomID}, {$pull: {events: {eventID: eventDoc._id}}}, function (errorUpdateRoom) {
									if(errorUpdateRoom) console.log(errorUpdateRoom);
									resold(); // resolve inner promise (stored in the promises array)
								});
							}));
						});
						/* End Update the room availability */

						/* Update staff member attending events */
						eventDoc.staffChosen.forEach(function (staff_member_chosen) {
							promises.push(new Promise(function(resold) {
								// remove event from the attending events
								Staff.updateOne({_id: staff_member_chosen.staffMemberID}, {$pull: {attendingEvents: {eventID: eventDoc._id}}}, function (errorUpdateStaff) {
									if(errorUpdateStaff) console.log(errorUpdateStaff);

									// add event to the attended events
									Staff.updateOne({_id: staff_member_chosen.staffMemberID}, {$push:
											{
												attendedEvents: {
													eventID: eventDoc._id,
													eventName: eventDoc.eventName,
													role: staff_member_chosen.role
												}}}, function (errorUpdateStaff) {
										if(errorUpdateStaff) console.log(errorUpdateStaff);
										resold(); // resolve inner promise (stored in the promises array)
									});
								});
							}));
						});
						/* End Update staff member attending events */

						/* Update visitors attending events */
						eventDoc.visitors.forEach(function (visitor_attending) {
							promises.push(new Promise(function(resold) {
								// remove event from the attending events
								Visitor.updateOne({_id: visitor_attending.visitorID}, {$pull:
										{
											attendingEvents: {
												eventID: eventDoc._id
											}}}, function (errorUpdateVisitor) {
									if(errorUpdateVisitor) console.log(errorUpdateVisitor);

									// add event to the attended events
									Visitor.updateOne({_id: visitor_attending.visitorID}, {$push:
											{
												attendedEvents: {
													eventID: eventDoc._id,
													eventName: eventDoc.eventName,
													groupSize: visitor_attending.groupSize
												}}}, function (errorUpdateVisitor) {
										if(errorUpdateVisitor) console.log(errorUpdateVisitor);
										resold(); // resolve inner promise (stored in the promises array)
									});
								});


							}));
						});
						/* End Update visitors attending events */

						Promise.all(promises).then(() => {
							equipment_event.forEach(function (equip) { // iterate through equipment of the event
								equipment.push({ // add the object to the array of equipment to be added to the archive event
									typeName: equip.typeName,
									reqQty: equip.reqQty,
									customFields: equip.customFields
								});
							});

							rooms_event.forEach(function (room) { // iterate through rooms of the event
								rooms.push({ // add the object to the array of rooms to be added to the archive event
									roomName: room.roomName,
									capacity: room.capacity,
									customFields: room.customFields
								});
							});

							staff_event.forEach(function (staff_member) { // iterate through staff members of the event
								staff.push({ // add the object to the array of staff members to be added to the archive event
									staffMemberID:staff_member._id,
									fullName: staff_member.fullName,
									email: staff_member.email,
									role: staff_member.role
								});
							});

							visitors_event.forEach(function (visitor) { // iterate through visitors of the event
								visitorInfo.push({ // add the object to the array of the visitors to be added to the archive event
									visitorID:visitor._id,
									institutionName:visitor.institutionName,
									groupSize:visitor.groupSize
								});
							});

							rooms_event.forEach(function (room) { // count number of spaces
								numberOfSpaces = numberOfSpaces + room.capacity; // increment number of spaces
							});

							if(archive) { // if event needs to be archived
								archiveEvent(eventDoc, equipment, rooms, event_type, staff, numberOfSpaces, visitorInfo).then(function () { // archive the event information
									Event.deleteOne({_id: id}, function (err) { // delete the event from the database
										if (!err) {
											resolve("Successfully deleted event!"); // resolve with success message
										} else {
											console.log(err); // console log the error
											reject("Error while deleting event."); // reject with error message (handled in catch)
										}
									});
								}).catch(function () {
									reject("Error while archiving event."); // reject with error message (handled in catch)
								});
							}
						});
					} else { // error or event not found
						console.log(err); // console log the error
						reject("Event not found."); // reject with error message (handled in catch)
					}
				});
				break;
		}
	});
}

/**
 * This function creates a new archive event in the database.
 * @param event The event information
 * @param equipment The equipment information
 * @param rooms The rooms information
 * @param event_type The event type information
 * @param staff The staff member information
 * @param numberOfSpaces The number of spaces
 * @param visitorInfo The visitor information
 * @returns {Promise<any>}
 */
function archiveEvent(event,equipment,rooms,event_type,staff,numberOfSpaces,visitorInfo){
	return new Promise(function(resolve,reject){
		let new_archive_event = new Archive({ // create new event
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

		new_archive_event.save(function (errSave) { // insert it into the database
			if (!errSave) {
				resolve();
			} else {
				console.log(errSave);
				reject();
			}
		});
	});
}

/**
 * This function archives the events that have expired
 * @returns {Promise<void>}
 */
async function archiveEvents() {
	Event.find({}, null, {sort: {date: 1}}, function (err, eventDoc) { // find all the events sorted by date
		if (!err) {
			if (eventDoc) { // events found
				let today = Date.parse(new Date()); // today's date in milliseconds

				if(eventDoc.length > 0) { // check if there are any events

					// check if the first event date has passed
					if ((eventDoc[0].endDate && Date.parse(eventDoc[0].endDate) < today) ||
						(!eventDoc[0].endDate && eventDoc[0].date && Date.parse(eventDoc[0].date) < today)) {

						eventDoc.forEach(async function (event) { // check all the events date if they have passed
							if ((event.endDate && Date.parse(event.endDate) < today) ||
								(!event.endDate && event.date && Date.parse(event.date) < today)) {
								deleteEvent(event._id, "event-list",true).then().catch();
							}
						});
					}
				}
			}
		} else { // error occurred
			console.log(err);
		}
	});
}

module.exports = { // export the functions
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
	notifyForApproachingEvents:notifyForApproachingEvents,
	sendNotification:sendNotification,
	sendEmail:sendEmail,
	deleteEvent:deleteEvent,
	archiveEvents:archiveEvents
};