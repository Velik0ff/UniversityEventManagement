const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

/* Model */
const Event = require('../models/Event');
const EventType = require('../models/EventType');
const Equipment = require('../models/EqInventory');
const Staff = require('../models/staff_user');
const Visitor = require('../models/visitor_user');
/* End Model */

const editLink = "edit-event";
const viewLink = "view-event";
const addLink = "add-event";
const deleteLink = "delete-event";
const listLink = "list-events";

/* Functions */
function validationErr(error){
	var error_msg = "";

	if(error.name === "ValidationError"){ // check if the error is from the validator
		if (typeof error.errors.eventName !== "undefined" &&
			error.errors.eventName !== null) {
			error_msg = error.errors.eventName.message
		}
		if (typeof error.errors.equipID !== "undefined" &&
			error.errors.equipID !== null) {
			error_msg = error.errors.equipID.message
		}
		// if (typeof error.errors.eventSpaces !== "undefined" &&
		// 	error.errors.eventSpaces !== null) {
		// 	error_msg = error.errors.eventSpaces.message
		// }
		if (typeof error.errors.eventTypeID !== "undefined" &&
			error.errors.eventTypeID !== null) {
			error_msg = error.errors.eventTypeID.message
		}
		if (typeof error.errors.staffMemberID !== "undefined" &&
			error.errors.staffMemberID !== null) {
			error_msg = error.errors.staffMemberID.message
		}
		if (typeof error.errors.role !== "undefined" &&
			error.errors.role !== null) {
			error_msg = error.errors.role.message
		}
		if (typeof error.errors.date !== "undefined" &&
			error.errors.date !== null) {
			error_msg = error.errors.date.message
		}
		if (typeof error.errors.location !== "undefined" &&
			error.errors.location !== null) {
			error_msg = error.errors.location.message
		}
		console.log(error_msg);
	}

	return error_msg;
}

function getEquipmentInfo(event_equipment){
	return new Promise((resolve,reject) => {
		var event_equip_ids_arr = [];

		event_equipment.forEach((event_eq)=>{
			event_equip_ids_arr.push(event_eq.equipID);
		});

		Equipment.find({_id:{$in:event_equip_ids_arr}}, function (err, equipment) {
			if(!err){
				event_equipment.forEach(function(equip_chosen){
					equipment.forEach(function(equip){
						equip.reqQty = equip_chosen.reqQty;
					});
				});
				resolve(equipment)
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
				staff_chosen.forEach(function(staff_member_chosen){
					staff.forEach(function(staff_member){
						staff_member.role = staff_member_chosen.role
					});
				});
				resolve(staff);
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

function getPostedStaff(req){
	var staff_use = [];

	for(const [ field_post_key, field_post_value ] of Object.entries(req.body)) {
		if(req.body.hasOwnProperty(field_post_key)) {
			if(field_post_key.includes('staffID')) {
				staff_use.push({
					_id: field_post_value,
					staffMemberID: field_post_value,
					role: ""
				});
			} else if(field_post_key.includes('staffRole')){
				staff_use[staff_use.length-1]['role'] = field_post_value;
			}
		}
	}

	return staff_use;
}

function getPostedVisitors(req){
	var visitor_attending = [];

	for(const [ field_post_key, field_post_value ] of Object.entries(req.body)) {
		if(req.body.hasOwnProperty(field_post_key)) {
			if(field_post_key.includes('visitor')) {
				visitor_attending.push({
					_id: field_post_value,
					visitorID: field_post_value
				});
			}
		}
	}

	return visitor_attending;
}

async function sendEmail(email,type){
	// Generate test SMTP service account from ethereal.email
	// Only needed if you don't have a real mail account for testing
	let testAccount = await nodemailer.createTestAccount();

	// create reusable transporter object using the default SMTP transport
	let transporter = nodemailer.createTransport({
		// host: "smtp.mailgun.org",
		host:"smtp.ethereal.email",
		port: 587,
		secure: false, // true for 465, false for other ports
		auth: {
			user: testAccount.user,
			pass: testAccount.pass
			// user: 'postmaster@sandbox93442b8153754117ada8172d0ef1129f.mailgun.org', // generated ethereal user
			// pass: 'd6b25d3e7711da468290a08b2c1db517-074fa10c-7dd01f0c' // generated ethereal password
		}
	});

	var info = null; // store the callback email data
	// send mail with defined transport object
	switch(type){
		case "added":
			info = await transporter.sendMail({
				from: '"University of Liverpool Event System" <no-reply@uol-events.co.uk>', // sender address
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
	}


	console.log("Message sent: %s", info.messageId);
	// Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

	// Preview only available when sending through an Ethereal account
	console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
	// Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}
/* End Functions */

router.get('/participate-events-list', function(req, res, next){
	let columns = ["ID", "Event Name"];
	var error = "";

	if(req.user && req.user.permission === 0){
		Staff.findOne({_id: req.user._id}, function(err, staffDoc){
			if(err) console.log(err)

			Event.find({_id:{$in:staffDoc.attendingEvents}}, function (err, events) {
				var eventList = [];

				events.forEach(function (event) {
					eventList.push({
						id:event._id,
						name:event.eventName,
					});
				});

				error = eventList.length === 0 ? "No results to show" : ""

				res.render('list', {
					title: 'Events List',
					list:eventList,
					columns:columns,
					editLink: editLink,
					viewLink: viewLink,
					// addLink: addLink,
					deleteLink: deleteLink,
					error:error,
					user:req.user
				});
			});
		});
	} else if(req.user && req.user.permission === 1){
		Visitor.findOne({_id: req.user._id}, function(err, visitorDoc){
			if(err) console.log(err)

			Event.find({_id:{$in:visitorDoc.attendingEvents}}, function (err, events) {
				var eventList = [];

				events.forEach(function (event) {
					eventList.push({
						id:event._id,
						name:event.eventName,
					});
				});

				error = eventList.length === 0 ? "You are not participating to any events. Please come back later or contact an administrator!" : ""

				res.render('list', {
					title: 'Events List',
					list:eventList,
					columns:columns,
					viewLink: viewLink,
					error:error,
					user:req.user
				});
			});
		});
	} else {
		res.redirect('/');
	}
});

router.get('/list-events', function(req, res, next) {
	if(req.user && req.user.permission === 0) {
		let columns = ["ID", "Event Name", "Options"];
		var error = "";

		Event.find({}, function (err, events) {
			var eventList = [];

			events.forEach(function (event) {
				eventList.push({
					id: event._id,
					name: event.eventName,
				});
			});

			error = eventList.length === 0 ? "No results to show" : ""

			res.render('list', {
				title: 'Events List',
				list: eventList,
				columns: columns,
				editLink: editLink,
				viewLink: viewLink,
				addLink: addLink,
				deleteLink: deleteLink,
				error: error,
				user:req.user
			});
		});
	} else {
		res.redirect('/');
	}
});

router.get('/view-event', function(req, res, next) {
	if(req.user && (req.user.permission === 0 || req.user.permission === 1)) {
		/* Logic to get info from database */
		Event.findOne({_id: req.query.id}, async function (err, event) {
			if (!err && event) {
				var attending = false;

				if(req.user.permission === 1){
					event.visitors.forEach(function(visitor){
						if(visitor.visitorID === req.user._id){
							attending = true;
						}
					});
				}

				if(req.user.permission === 0 || attending) {
					var equipment = await getEquipmentInfo(event.equipment);
					var event_type = await getEventType(event.eventTypeID);
					var staff = await getStaffInfo(event.staffChosen);
					var visitors = await getVisitorInfo(event.visitors)
					var numberOfSpaces = 0;
					var numberOfVisitors = 0;

					Promise.all([equipment, event_type, staff]).then((result) => {
						equipment.forEach(function (equip) {
							equip.customFields.forEach(function (field) {
								if (field.fieldName === "Room Capacity" && parseInt(field.fieldValue)) {
									numberOfSpaces = numberOfSpaces + (parseInt(field.fieldValue)*equip.quantity)
								}
							});
						});

						visitors.forEach(function (visitor) {
							visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : "";
						});

						res.render('view', {
							title: 'Viewing event: ' + event.eventName,
							error: null,
							item: {
								ID: event._id,
								Name: event.eventName,
								Equipment: equipment,
								"Event Spaces": numberOfSpaces,
								"Event Type": event_type,
								"Staff Chosen": staff,
								Date: event.date,
								Location: event.location,
								"Number of Visitors": numberOfVisitors
							},
							listLink: req.user.permission === 0 ? listLink : 'participate-events-list',
							deleteLink: req.user.permission === 0 ? deleteLink : null,
							editLink: req.user.permission === 0 ? editLink + '?id=' + event._id : null,
							user:req.user
						});
					});
				} else {
					res.redirect('events/participate-events-list');
				}
			} else {
				console.log(err);
				res.render('view', {
					error: "Event not found!",
					listLink: listLink,
					user:req.user
				});
			}
		});
		/* End Logic to get info from database */
	}
});

router.get('/edit-event', function(req, res, next) {
	if(req.user && req.user.permission === 0) {
		Event.findOne({_id: req.query.id}, async function (err, event) {
			if (!err && event) {
				var equipment_use = await getEquipmentInfo(event.equipment);
				var event_type = await getEventType(event.eventTypeID);
				var staff_use = await getStaffInfo(event.staffChosen);
				var visitor_attending = await getVisitorInfo(event.visitors);
				var visitors = await getAllVisitor();
				var equipment = await getAllEquipment();
				var staff = await getAllStaff();
				var eventTypes = await getAllEventTypes();

				Promise.all([equipment, equipment_use, event_type, staff, staff_use, visitors, visitor_attending, eventTypes]).then((result) => {
					console.log(eventTypes)
					res.render('edit', {
						title: 'Editing event: ' + event.eventName,
						error: null,
						item: {
							ID: event._id,
							"Event Name": event.eventName,
							Location: event.location,
							Date: event.date,
							"Event Type": event_type,
							Equipment: equipment_use,
							Staff: staff_use,
							Visitors: visitor_attending
						},
						eventTypes: eventTypes,
						staff: staff,
						equipment: equipment,
						visitors: visitors,
						customFields: false,
						equipmentFields: true,
						staffFields: true,
						visitorFields: true,
						editLink: '/events/' + editLink,
						cancelLink: viewLink + '?id=' + event._id,
						user:req.user
					});
				});
			} else {
				res.render('view', {
					error: "Event not found!",
					listLink: listLink,
					user:req.user
				});
			}
		});
	} else {
		res.redirect('/');
	}
});

router.post('/edit-event', function(req, res, next) {
	function getPostedEquipment(req){
		var equipment_posted = [];

		for(const [ field_post_key, field_post_value ] of Object.entries(req.body)) {
			if(req.body.hasOwnProperty(field_post_key)) {
				if(field_post_key.includes('equipment')) {
					equipment_posted.push({
						_id: field_post_value,
						equipID: field_post_value,
						reqQty: 1
					});
				} else if(field_post_key.includes('quantity')){
					equipment_posted[equipment_posted.length-1]['reqQty'] = parseInt(field_post_value);
				}
			}
		}

		return equipment_posted;
	}

	if(req.user && req.user.permission === 0) {
		Event.findOne({_id: req.body.ID}, async function (err, event) {
			if (!err && event) {
				var equipment_use = await getEquipmentInfo(event.equipment);
				var event_type = await getEventType(event.eventTypeID);
				var staff_use = await getStaffInfo(event.staffChosen);
				var visitor_attending = await getVisitorInfo(event.visitors);
				var visitors = await getAllVisitor();
				var equipment = await getAllEquipment();
				var staff = await getAllStaff();
				var eventTypes = await getAllEventTypes();

				var posted_staff_use = getPostedStaff(req);
				var posted_visitors = getPostedVisitors(req);
				var posted_equipment = getPostedEquipment(req);

				Promise.all([equipment, equipment_use, event_type, staff, staff_use, visitors, visitor_attending, eventTypes]).then((result) => {
					staff_use.forEach(function (prev_staff_member) {
						var staff_posted = false;

						posted_staff_use.forEach(function (posted_staff_member) {
							if (posted_staff_member._id === prev_staff_member.staffMemberID) staff_posted = true;
						});

						if (!staff_posted) {
							Staff.updateOne({_id: prev_staff_member.staffMemberID}, {$pull: {attendingEvents: {eventID: event._id}}}, function (errorUpdateStaff, staffDoc) {
								if(!errorUpdateStaff){
									sendEmail(staffDoc, "removed");
								} else {
									console.log(errorUpdateStaff);
								}
							});
						}
					});

					posted_staff_use.forEach(function (posted_staff_member) {
						var new_staff = true;

						staff_use.forEach(function (prev_staff_member) {
							if (posted_staff_member._id === prev_staff_member.staffMemberID) new_staff = false;
						});

						if(new_staff){
							Staff.findOne({_id:posted_staff_member._id}, function(errorFindStaffEmail, staffDoc){
								if(!errorFindStaffEmail){
									sendEmail(staffDoc.email, "added");
								} else {
									console.log(errorFindStaffEmail);
								}
							});
						}
					});

					visitor_attending.forEach(function (prev_visitor) {
						var visitor_posted = false;

						posted_visitors.forEach(function (posted_visitor) {
							if (posted_visitor._id === prev_visitor.visitorID) visitor_posted = true;
						});

						if (!visitor_posted) {
							Visitor.updateOne({_id: prev_visitor.visitorID}, {$pull: {attendingEvents: {eventID: event._id}}}, function (errorUpdateVisitor, visitorDoc) {
								console.log(errorUpdateVisitor);
							});
						}
					});

					posted_visitors.forEach(function (posted_visitor) {
						var new_visitor = true;

						visitor_attending.forEach(function (prev_visitor) {
							if (posted_visitor._id === prev_visitor.visitorID) new_visitor = false;
						});

						if (new_visitor) {
							Staff.findOne({_id:posted_visitor._id}, function(errorFindVisitorEmail, visitorDoc){
								if(!errorFindVisitorEmail){
									sendEmail(visitorDoc.contactEmail, "added");
								} else {
									console.log(errorFindVisitorEmail);
								}
							});
						}
					});

					equipment_use.forEach(function (prev_equip) {
						var equipment_posted = false;
						var equip_qty = 0;

						posted_equipment.forEach(function (posted_equip) {
							if (posted_equip._id === prev_equip.equipID) {
								equipment_posted = true;
								equip_qty = prev_equip.reqQty - posted_equip.reqQty;
							}
						});

						if (!equipment_posted) {
							Equipment.updateOne({_id: prev_equip.equipID}, {$inc: {quantity: prev_equip.reqQty}}, function (errorUpdateEquip, equipDoc) {
								console.log(errorUpdateEquip);
							});
						} else if (equip_qty !== 0) {
							Equipment.updateOne({_id: prev_equip.equipID}, {$inc: {quantity: equip_qty}}, function (errorUpdateEquip, equipDoc) {
								console.log(errorUpdateEquip);
							});
						}
					});

					var event_type_update = {
						$set: {
							eventName: req.body['Event Name'],
							equipment: posted_equipment,
							eventTypeID: req.body['Event Type'],
							staffChosen: posted_staff_use,
							date: req.body.Date,
							location: req.body.Location,
							visitors: posted_visitors
						}
					}

					Event.updateOne({_id: req.body.ID}, event_type_update, function (err, eventUpdateDoc) {
						if (!err) {
							posted_staff_use.forEach(function(staffMember){
								Staff.findOne({_id:staffMember.staffMemberID}, function(errorStaffSendEmail, staffMemberDoc){
									if(!errorStaffSendEmail){
										sendEmail(staffMemberDoc.email,"edited");
									}
								});
							});

							posted_visitors.forEach(function(visitor){
								Visitor.findOne({_id:visitor.visitorID}, function(errorVisitorSendEmail, visitorDoc){
									if(!errorVisitorSendEmail){
										sendEmail(visitorDoc.contactEmail,"edited");
									}
								});
							});

							res.render('edit', {
								title: 'Editing event: ' + event.eventName,
								error: null,
								message: "Successfully updated event: " + event.eventName,
								item: {
									ID: event._id,
									"Event Name": event.eventName,
									Location: event.location,
									Date: event.date,
									"Event Type": event_type,
									Equipment: posted_equipment,
									Staff: posted_staff_use,
									Visitors: posted_visitors
								},
								eventTypes: eventTypes,
								staff: staff,
								equipment: equipment,
								visitors: visitors,
								customFields: false,
								equipmentFields: true,
								staffFields: true,
								visitorFields: true,
								editLink: '/events/' + editLink,
								cancelLink: viewLink + '?id=' + event._id,
								user:req.user
							});
						} else {
							res.render('edit', {
								title: 'Editing event: ' + event.eventName,
								error: "Unknown error occurred, please try again.",
								message: null,
								item: {
									ID: event._id,
									"Event Name": event.eventName,
									Location: event.location,
									Date: event.date,
									"Event Type": event_type,
									Equipment: posted_equipment,
									Staff: posted_staff_use,
									Visitors: posted_visitors
								},
								eventTypes: eventTypes,
								staff: staff,
								equipment: equipment,
								visitors: visitors,
								customFields: false,
								equipmentFields: true,
								staffFields: true,
								visitorFields: true,
								editLink: '/events/' + editLink,
								cancelLink: viewLink + '?id=' + event._id,
								user:req.user
							});
						}
					});
				});
			} else {
				res.render('view', {
					error: "Event not found!",
					listLink: listLink,
					user:req.user
				});
			}
		});
	} else {
		res.redirect('/');
	}
});

router.get('/'+deleteLink, function(req, res, next) {
	if(req.user && req.user.permission === 0) {
		Event.findOne({_id: req.query.id}, function (err, eventDoc) {
			if (!err && eventDoc) {
				var promises = [];

				eventDoc.equipment.forEach(function (equip) {
					promises.push(new Promise((resolve, reject) => {
						Equipment.updateOne({_id: equip.equipID}, {$inc: {quantity: equip.reqQty}}, function (errorUpdateEquip, equipDoc) {
							console.log(errorUpdateEquip);
							resolve();
						});
					}));
				});

				eventDoc.staffChosen.forEach(function (staff_member_chosen) {
					promises.push(new Promise((resolve, reject) => {
						Staff.updateOne({_id: staff_member_chosen.staffMemberID}, {$pull: {attendingEvents: {eventID: eventDoc._id}}}, function (errorUpdateStaff, staffDoc) {
							console.log(errorUpdateStaff);
							resolve();
						});
					}));
				});

				eventDoc.visitors.forEach(function (visitor_attending) {
					promises.push(new Promise((resolve, reject) => {
						Visitor.updateOne({_id: visitor_attending.visitorID}, {$pull: {attendingEvents: {eventID: eventDoc._id}}}, function (errorUpdateVisitor, visitorDoc) {
							console.log(errorUpdateVisitor);
							resolve();
						});
					}));
				});

				Promise.all(promises).then(() => {
					Event.deleteOne({_id: req.query.id}, function (err, deleteResult) {
						if (!err) {
							res.render('view', {
								deleteMsg: "Successfully deleted event!",
								listLink: listLink,
								user:req.user
							});
						} else {
							console.log(err); // console log the error
						}
					});
				});
			} else {
				console.log(err); // console log the error
				res.render('view', {
					error: "Event not found!",
					listLink: listLink,
					user:req.user
				});
			}
		});
	} else {
		res.redirect('/');
	}
});

router.get('/add-event', async function (req, res, next) {
	if(req.user && req.user.permission === 0) {
		let fields = [{name: "Event Name", type: "text", identifier: "name"},
			{name: "Location", type: "text", identifier: "location"},
			{name: "Date", type: "datetime-local", identifier: "date"},
			{name: "Event Type", type: "select", identifier: "eventType"}];

		var visitors = await getAllVisitor();
		var equipment = await getAllEquipment();
		var staff = await getAllStaff();
		var eventTypes = await getAllEventTypes();

		Promise.all([equipment, eventTypes, visitors, staff]).then((result) => {
			res.render('add', {
				title: 'Add New Event',
				fields: fields,
				cancelLink: listLink,
				customFields: false,
				equipmentFields: true,
				staffFields: true,
				visitorFields: true,
				visitors: visitors,
				equipment: equipment,
				eventTypes: eventTypes,
				staff: staff,
				user:req.user
			});
		});
	} else {
		res.redirect('/');
	}
});

router.post('/add-event', async function (req, res, next) {
	if(req.user && req.user.permission === 0) {
		let fields = [{name: "Event Name", type: "text", identifier: "name"},
			{name: "Location", type: "text", identifier: "location"},
			{name: "Date", type: "datetime-local", identifier: "date"},
			{name: "Event Type", type: "select", identifier: "eventType"}];

		var error_msg = "";
		var message = "";
		var visitors = await getAllVisitor();
		var equipment = await getAllEquipment();
		var staff = await getAllStaff();
		var eventTypes = await getAllEventTypes();
		var equipment_use = [];
		var staff_use = getPostedStaff(req);
		var visitor_attending = getPostedVisitors(req);

		for (const [field_post_key, field_post_value] of Object.entries(req.body)) {
			if (req.body.hasOwnProperty(field_post_key)) {
				if (field_post_key.includes('equipment')) {
					equipment_use.push({
						equipID: field_post_value,
						reqQty: 1
					});
				} else if (field_post_key.includes('quantity')) {
					equipment_use[equipment_use.length - 1]['reqQty'] = parseInt(field_post_value);

					Equipment.updateOne({_id: equipment_use[equipment_use.length - 1]['equipID']}, {$inc: {quantity: -equipment_use[equipment_use.length - 1]['reqQty']}}, function (err, eqDoc) {
						if (err) {
							console.log("Failed to update quantity for id:" + equipment_use[equipment_use.length - 1]['equipID']);
							console.log(err);
						}
					});
				}
			}
		}

		let new_event = new Event({
			eventName: req.body['Event Name'],
			equipment: equipment_use,
			eventTypeID: req.body['Event Type'],
			staffChosen: staff_use,
			date: req.body.Date,
			location: req.body.Location,
			visitors: visitor_attending
		});

		new_event.save(function (error, eventDoc) {
			if (!error) {
				staff_use.forEach(function (staff_member) {
					Staff.findOne({_id: staff_use.staffMemberID}, function (err, staffDoc) {
						if (!err && staffDoc) {
							Staff.updateOne({_id: staff_use.staffMemberID}, {
								$push: {
									attendingEvents: {
										eventID: eventDoc._id,
										role: staff_use.role
									}
								}
							}, function (errUpdate, staffDoc) {
								if (errUpdate) {
									console.log(errUpdate);
								} else {
									sendEmail(staffDoc.email, "added");
								}
							});
						} else { // staff not found or error with database
							console.log(err);
						}
					});
				});

				visitor_attending.forEach(function (staff_member) {
					Visitor.findOne({_id: visitor_attending.visitorID}, function (err, visitorDoc) {
						if (!err && visitorDoc) {
							Visitor.updateOne({_id: visitor_attending.visitorID}, {$push: {attendingEvents: {eventID: eventDoc._id}}}, function (errUpdate, visitorDoc) {
								if (errUpdate) {
									console.log(errUpdate);
								} else {
									sendEmail(visitorDoc.contactEmail, "added");
								}
							});
						} else { // visitor not found or error with database
							console.log(err);
						}
					});
				});

				message = "Successfully create new event: " + req.body['Event Name'];
				console.log(message);
				// sendInvitationEmail(req.body.Email, password_to_insert, req.body.Role);
			} else {
				/* Recover quantity */
				for (var i = 0; i < equipment_use.length; i++) {
					Equipment.updateOne({_id: equipment_use[i]['equipID']}, {$inc: {quantity: +equipment_use[i]['reqQty']}}, function (err, eqDoc) {
						if (err) {
							console.log(err);
						}
					});
				}
				/* End Recover quantity */

				error_msg = validationErr(error);
			}

			Promise.all([equipment, eventTypes, visitors, staff]).then((result) => {
				res.render('add', {
					title: 'Add New Event',
					error: error_msg,
					message: message,
					fields: fields,
					cancelLink: listLink,
					customFields: false,
					equipmentFields: true,
					staffFields: true,
					visitorFields: true,
					visitors: visitors,
					equipment: equipment,
					eventTypes: eventTypes,
					staff: staff,
					selectedEventType: req.body['Event Type'],
					selectedStaff: staff_use,
					selectedEquip: equipment_use,
					selectedVisitors: visitor_attending,
					user:req.user
				});
			});
		});
	} else {
		res.redirect('/');
	}
});

module.exports = router;
