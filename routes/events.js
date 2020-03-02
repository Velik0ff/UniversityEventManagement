const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

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
/* End Functions */

router.get('/list-events', function(req, res, next) {
	let columns = ["ID", "Event Name", "Options"];
	var error = "";

	Event.find({}, function (err, events) {
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
			addLink: addLink,
			deleteLink: deleteLink,
			error:error
		});
	});
});

router.get('/view-event', function(req, res, next) {
	/* Logic to get info from database */
	Event.findOne({_id:req.query.id}, async function (err, event) {
		if (!err && event) {
			var equipment = await getEquipmentInfo(event.equipment);
			var event_type = await getEventType(event.eventTypeID);
			var staff = await getStaffInfo(event.staffChosen);
			var visitors = await getVisitorInfo(event.visitors)
			var numberOfSpaces = 0;
			var numberOfVisitors = 0;

			Promise.all([equipment, event_type, staff]).then((result) => {
				equipment.forEach(function(equip){
					equip.customFields.forEach(function(field){
						if(field.fieldName === "Room Capacity" && parseInt(field.fieldValue)){
							numberOfSpaces = numberOfSpaces + parseInt(field.fieldValue)
						}
					});
				});

				visitors.forEach(function(visitor){
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
						// "Staff Required":
						"Staff Chosen": staff,
						Date: event.date,
						Location: event.location,
						"Number of Visitors": numberOfVisitors
					},
					listLink: listLink,
					deleteLink: deleteLink,
					editLink: editLink + '?id=' + event._id
				});
			});
		} else {
			res.render('view', {
				error: "Event not found!",
				listLink: listLink
			});
		}
	});
	/* End Logic to get info from database */
});

router.get('/edit-event', function(req, res, next) {
	Event.findOne({_id:req.query.id}, async function (err, event) {
		if (!err && event) {
			var equipment_use = await getEquipmentInfo(event.equipment);
			var event_type = await getEventType(event.eventTypeID);
			var staff_use = await getStaffInfo(event.staffChosen);
			var visitor_attending = await getVisitorInfo(event.visitors);
			var visitors = await getAllVisitor();
			var equipment = await getAllEquipment();
			var staff = await getAllStaff();
			var eventTypes = await getAllEventTypes();

			Promise.all([equipment,equipment_use,event_type,staff,staff_use,visitors,visitor_attending,eventTypes]).then((result) => {
				console.log(eventTypes)
				res.render('edit', {
					title: 'Editing event: '+event.eventName,
					error:null,
					item:{
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
					customFields:false,
					equipmentFields: true,
					staffFields: true,
					visitorFields: true,
					editLink: '/events/'+editLink,
					cancelLink: viewLink+'?id='+event._id
				});
			});
		} else {
			res.render('view', {
				error: "Event not found!",
				listLink: listLink
			});
		}
	});
});

router.get('/'+deleteLink, function(req, res, next) {
	Event.findOne({_id:req.query.id}, function(err, eventDoc){
		if(!err && eventDoc){
			var promises = [];

			eventDoc.equipment.forEach(function(equip){
				promises.push(new Promise((resolve,reject)=>{
					Equipment.updateOne({_id:equip.equipID},{$inc:{quantity:equip.reqQty}},function(errorUpdateEquip, equipDoc){
						console.log(errorUpdateEquip);
						resolve();
					});
				}));
			});

			eventDoc.staffChosen.forEach(function(staff_member_chosen){
				promises.push(new Promise((resolve,reject)=>{
					Staff.updateOne({_id:staff_member_chosen.staffMemberID},{$pull:{attendingEvents:{eventID:eventDoc._id}}},function(errorUpdateStaff, equipDoc){
						console.log(errorUpdateStaff);
						resolve();
					});
				}));
			});

			eventDoc.visitors.forEach(function(visitor_attending){
				promises.push(new Promise((resolve,reject)=>{
					Visitor.updateOne({_id:visitor_attending.visitorID},{$pull:{attendingEvents:{eventID:eventDoc._id}}},function(errorUpdateVisitor, equipDoc){
						console.log(errorUpdateVisitor);
						resolve();
					});
				}));
			});

			Promise.all(promises).then(()=>{
				Event.deleteOne({_id:req.query.id}, function(err, deleteResult){
					if(!err){
						res.render('view', {
							deleteMsg:"Successfully deleted event!",
							listLink: listLink
						});
					} else {
						console.log(err); // console log the error
					}
				});
			});
		} else {
			console.log(err); // console log the error
			res.render('view', {
				error:"Event not found!",
				listLink: listLink
			});
		}
	});
});

router.get('/add-event', async function (req, res, next) {
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
			staff: staff
		});
	});
});

router.post('/add-event', async function (req, res, next) {
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
	var staff_use = [];
	var visitor_attending = [];

	for(const [ field_post_key, field_post_value ] of Object.entries(req.body)) {
		if(req.body.hasOwnProperty(field_post_key)) {
			if(field_post_key.includes('equipment')) {
				equipment_use.push({
					equipID: field_post_value,
					reqQty: 1
				});
			} else if(field_post_key.includes('quantity')){
				equipment_use[equipment_use.length-1]['reqQty'] = parseInt(field_post_value);

				Equipment.updateOne({_id:equipment_use[equipment_use.length-1]['equipID']}, {$inc:{quantity:-equipment_use[equipment_use.length-1]['reqQty']}}, function(err, eqDoc){
					if(err){
						console.log("Failed to update quantity for id:"+equipment_use[equipment_use.length-1]['equipID']);
						console.log(err);
					}
				});
			}
		}
	}

	for(const [ field_post_key, field_post_value ] of Object.entries(req.body)) {
		if(req.body.hasOwnProperty(field_post_key)) {
			if(field_post_key.includes('staffID')) {
				staff_use.push({
					staffMemberID: field_post_value,
					role: ""
				});
			} else if(field_post_key.includes('staffRole')){
				staff_use[staff_use.length-1]['role'] = field_post_value;
			}
		}
	}

	for(const [ field_post_key, field_post_value ] of Object.entries(req.body)) {
		if(req.body.hasOwnProperty(field_post_key)) {
			if(field_post_key.includes('visitor')) {
				visitor_attending.push({
					visitorID: field_post_value,
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
			staff_use.forEach(function(staff_member){
				Staff.findOne({_id:staff_use.staffMemberID},function(err,staffDoc){
					if(!err && staffDoc){
						Staff.updateOne({_id:staff_use.staffMemberID},{$push:{attendingEvents:{eventID:eventDoc._id, role:staff_use.role}}}, function(errUpdate, staffDoc){
							if(errUpdate){
								console.log(errUpdate);
							}
						});
					} else { // staff not found or error with database
						console.log(err);
					}
				});
			});

			visitor_attending.forEach(function(staff_member){
				Visitor.findOne({_id:visitor_attending.visitorID},function(err,visitorDoc){
					if(!err && visitorDoc){
						Visitor.updateOne({_id:visitor_attending.visitorID},{$push:{attendingEvents:{eventID:eventDoc._id}}}, function(errUpdate, visitorDoc){
							if(errUpdate){
								console.log(errUpdate);
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
			for(var i=0; i<equipment_use.length; i++) {
				Equipment.updateOne({_id:equipment_use[i]['equipID']}, {$inc:{quantity:+equipment_use[i]['reqQty']}}, function(err, eqDoc){
					if(err){
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
				error:error_msg,
				message:message,
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
				selectedStaff:staff_use,
				selectedEquip:equipment_use,
				selectedVisitors:visitor_attending
			});
		});
	});
});

module.exports = router;
