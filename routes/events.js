const express = require('express');
const router = express.Router();
const moment = require('moment');
const genFunctions = require('../functions/generalFunctions');
const process = require('process');
const webpush = require('web-push');

/* Model */
const Event = require('../models/Event');
const Equipment = require('../models/EqInventory');
const Staff = require('../models/staff_user');
const Visitor = require('../models/visitor_user');
const Archive = require('../models/EventArchive');
const Room = require('../models/Room');
/* End Model */

let editLink = "edit-event";
let viewLink = "view-event";
let addLink = "add-event";
let deleteLink = "delete-event";
let listLink = "list-events";
let exportLink = "../export?type=Events";
let signUpLink = "sign-up-event";

let error_msg = null;
let message = null;
let columns = ["ID", "Event Name", "Options"];

webpush.setVapidDetails(
	"mailto:sglvelik@liv.ac.uk",
	process.env.PUBLIC_VAPID_KEY,
	process.env.PRIVATE_VAPID_KEY
);

/* Functions */
function validationErr(error) {
	let local_error_msg = "";

	if (error.name === "ValidationError") { // check if the error is from the validator
		if (typeof error.errors.eventName !== "undefined" &&
			error.errors.eventName !== null) {
			local_error_msg = error.errors.eventName.message
		}
		if (typeof error.errors.equipID !== "undefined" &&
			error.errors.equipID !== null) {
			local_error_msg = error.errors.equipID.message
		}
		if (typeof error.errors.eventTypeID !== "undefined" &&
			error.errors.eventTypeID !== null) {
			local_error_msg = error.errors.eventTypeID.message
		}
		if (typeof error.errors.staffMemberID !== "undefined" &&
			error.errors.staffMemberID !== null) {
			local_error_msg = error.errors.staffMemberID.message
		}
		if (typeof error.errors.role !== "undefined" &&
			error.errors.role !== null) {
			local_error_msg = error.errors.role.message
		}
		if (typeof error.errors.date !== "undefined" &&
			error.errors.date !== null) {
			local_error_msg = error.errors.date.message
		}
		if (typeof error.errors.location !== "undefined" &&
			error.errors.location !== null) {
			local_error_msg = error.errors.location.message
		}
		console.log(local_error_msg);
	}

	return local_error_msg;
}

function resetErrorMessage(){
	error_msg = null;
	message = null;

	editLink = "edit-event";
	viewLink = "view-event";
	addLink = "add-event";
	deleteLink = "delete-event";
	listLink = "list-events";
	exportLink = "../export?type=Events";
	signUpLink = "sign-up-event";
}

function getPostedStaff(req) {
	let staff_use = [];

	for (const [field_post_key, field_post_value] of Object.entries(req.body)) {
		if (req.body.hasOwnProperty(field_post_key)) {
			if (field_post_key.includes('staffID')) {
				staff_use.push({
					_id: field_post_value,
					staffMemberID: field_post_value,
					role: ""
				});
			} else if (field_post_key.includes('staffRole')) {
				staff_use[staff_use.length - 1]['role'] = field_post_value;
			}

			// delete req.body[field_post_key];
		}
	}

	return staff_use;
}

function getPostedVisitors(req) {
	let visitor_attending = [];

	for (let [field_post_key, field_post_value] of Object.entries(req.body)) {
		if (req.body.hasOwnProperty(field_post_key)) {
			if (field_post_key.includes('visitor')) {
				visitor_attending.push({
					_id: field_post_value,
					visitorID: field_post_value
				});

				// delete req.body[field_post_key];
			}
		}
	}

	return visitor_attending;
}

function getPostedRooms(req) {
	let rooms_used = [];

	for (const [field_post_key, field_post_value] of Object.entries(req.body)) {
		if (req.body.hasOwnProperty(field_post_key)) {
			if (field_post_key.includes('roomID')) {
				rooms_used.push({
					_id: field_post_value,
					roomID: field_post_value
				});
			}

			// delete req.body[field_post_key];
		}
	}

	return rooms_used;
}

function recoverQuantity(previousQuantity) {
	for (let i = 0; i < previousQuantity.length; i++) {
		Equipment.updateOne({_id: previousQuantity[i]['equipID']}, {$set: {quantity: previousQuantity[i]['quantity']}}, function (err) {
			if (err) {
				console.log(err);
			}
		});
	}
}

function recoverRoomsAvailability(rooms,eventID){
	rooms.forEach(function(room){
		Room.updateOne({_id: room}, {$pull: {events: {eventID:eventID}}}, function (err) {
			if (err) {
				console.log(err);
			}
		});
	});
}

function listElement(res, req, allEventTypes, eventList, title, type) {
	allEventTypes.then(function (eventTypes) {
		if(title.includes('Archive')){
			exportLink = '../../export?type=Archive Events';
			deleteLink = '/events/archive/' + deleteLink;
			viewLink = 'view-archive-event';
			editLink = null;
			addLink = null;
		}

		res.render('list', {
			title: title,
			list: eventList,
			columns: columns,
			addLink: addLink,
			editLink: editLink,
			viewLink: viewLink,
			deleteLink: deleteLink,
			exportLink: req.user.permission >= 10 ? exportLink : null,
			error: error_msg,
			filter: "Events",
			type: type,
			eventTypes: eventTypes,
			user: req.user
		});

		resetErrorMessage();
	});
}

// function renderEdit(res, req, event, posted_equipment, posted_rooms, posted_staff_use, posted_visitors, eventTypes, staff, equipment, rooms, visitors) {
// 	let fields = [{name: "Event Name", type: "text", identifier: "name"},
// 		{name: "Description", type: "textarea", identifier: "description"},
// 		{name: "Location", type: "text", identifier: "location"},
// 		{name: "Date", type: "datetime-local", identifier: "date"},
// 		{name: "End Date", type: "datetime-local", identifier: "endDate"},
// 		{name: "Event Type", type: "select", identifier: "eventType"}];
// 	res.render('edit', {
// 		title: 'Editing event: ' + event.eventName,
// 		error: error_msg,
// 		message: message,
// 		item: {
// 			ID: event._id,
// 			"Event Name": event.eventName,
// 			"Description": event.eventDescription,
// 			Location: event.location,
// 			Date: moment(event.date).format('YYYY-MM-DDTHH:mm'),
// 			"End Date": event.endDate ? moment(event.endDate).format('YYYY-MM-DDTHH:mm') : "",
// 			"Event Type": event.eventType,
// 			Equipment: posted_equipment,
// 			Rooms: posted_rooms,
// 			Staff: posted_staff_use,
// 			Visitors: posted_visitors
// 		},
// 		eventTypes: eventTypes,
// 		staff: staff,
// 		equipment: equipment,
// 		rooms: rooms,
// 		visitors: visitors,
// 		customFields: false,
// 		equipmentFields: true,
// 		roomsFields: true,
// 		staffFields: true,
// 		visitorFields: true,
// 		editLink: '/events/' + editLink,
// 		cancelLink: viewLink + '?id=' + event._id,
// 		user: req.user
// 	});
//
// 	resetErrorMessage();
// }
//
// async function renderAdd(res, req, staff_use, equipment_use, rooms_use, visitor_attending) {
// 	let fields = [{name: "Event Name", type: "text", identifier: "name"},
// 		{name: "Description", type: "textarea", identifier: "description"},
// 		{name: "Location", type: "text", identifier: "location"},
// 		{name: "Date", type: "datetime-local", identifier: "date"},
// 		{name: "End Date", type: "datetime-local", identifier: "endDate"},
// 		{name: "Event Type", type: "select", identifier: "eventType"}];
// 	let visitors = await genFunctions.getAllVisitor();
// 	let equipment = await genFunctions.getAllEquipment();
// 	let rooms = await genFunctions.getAllRooms();
// 	let staff = await genFunctions.getAllStaff();
// 	let eventTypes = await genFunctions.getAllEventTypes();
//
// 	Promise.all([equipment, rooms, eventTypes, visitors, staff]).then(() => {
// 		res.render('add', {
// 			title: 'Add New Event',
// 			error: error_msg,
// 			message: message,
// 			fields: fields,
// 			cancelLink: listLink,
// 			customFields: false,
// 			roomsFields: true,
// 			equipmentFields: true,
// 			staffFields: true,
// 			visitorFields: true,
// 			visitors: visitors,
// 			equipment: equipment,
// 			rooms: rooms,
// 			eventTypes: eventTypes,
// 			staff: staff,
// 			item: {
// 				ID: req.body.ID,
// 				"Event Name": req.body['Event Name'],
// 				"Description": req.body['Description'],
// 				Location: req.body['Location'],
// 				Date: req.body.Date ? moment(req.body.Date).format('YYYY-MM-DDTHH:mm') : "",
// 				"End Date": req.body['End Date'] ? moment(req.body['End Date']).format('YYYY-MM-DDTHH:mm') : "",
// 				"Event Type": req.body['Event Type'],
// 			},
// 			selectedEventType: req.body['Event Type'],
// 			selectedStaff: staff_use,
// 			selectedEquip: equipment_use,
// 			selectedRooms: rooms_use,
// 			selectedVisitors: visitor_attending,
// 			user: req.user
// 		});
//
// 		resetErrorMessage();
// 	});
// }

function renderEdit(res, req, event, posted_equipment, posted_rooms, posted_staff_use, posted_visitors, eventTypes, staff, equipment, rooms, visitors) {
	let fields = [{name: "ID", type: "text", identifier: "id", readonly:true},
		{name: "Event Name", type: "text", identifier: "eventName"},
		{name: "Description", type: "textarea", identifier: "description"},
		{name: "Location", type: "text", identifier: "location"},
		{name: "Date", type: "datetime-local", identifier: "date"},
		{name: "End Date", type: "datetime-local", identifier: "endDate"},
		{name: "Event Type", type: "select", identifier: "eventType"}];

	console.log(posted_visitors)
	res.render('add-edit', {
		title: 'Editing event: ' + event.eventName,
		error: error_msg,
		message: message,
		fields: fields,
		actionLink:'/events/' + editLink,
		submitButtonText: "Save",
		cancelLink: viewLink + '?id=' + event._id,
		customFields: false,
		roomsFields: true,
		equipmentFields: true,
		staffFields: true,
		visitorFields: true,
		visitors: visitors,
		equipment: equipment,
		rooms: rooms,
		eventTypes: eventTypes,
		staff: staff,
		item: {
			id: event._id,
			eventName: event.eventName,
			description: event.eventDescription,
			location: event.location,
			date: moment(event.date).format('YYYY-MM-DDTHH:mm'),
			endDate: event.endDate ? moment(event.endDate).format('YYYY-MM-DDTHH:mm') : "",
		},
		selectedEventType: event.eventType,
		selectedStaff: posted_staff_use,
		selectedEquip: posted_equipment,
		selectedRooms: posted_rooms,
		selectedVisitors: posted_visitors,
		user: req.user
	});

	resetErrorMessage();
}

async function renderAdd(res, req, staff_use, equipment_use, rooms_use, visitor_attending) {
	let fields = [{name: "Event Name", type: "text", identifier: "eventName"},
		{name: "Description", type: "textarea", identifier: "description"},
		{name: "Location", type: "text", identifier: "location"},
		{name: "Date", type: "datetime-local", identifier: "date"},
		{name: "End Date", type: "datetime-local", identifier: "endDate"},
		{name: "Event Type", type: "select", identifier: "eventType"}];

	let visitors = await genFunctions.getAllVisitor();
	let equipment = await genFunctions.getAllEquipment();
	let rooms = await genFunctions.getAllRooms();
	let staff = await genFunctions.getAllStaff();
	let eventTypes = await genFunctions.getAllEventTypes();

	Promise.all([equipment, rooms, eventTypes, visitors, staff]).then(() => {
		res.render('add-edit', {
			title: 'Add New Event',
			error: error_msg,
			message: message,
			fields: fields,
			actionLink: '/events/' + addLink,
			submitButtonText: "Add",
			cancelLink: listLink,
			customFields: false,
			roomsFields: true,
			equipmentFields: true,
			staffFields: true,
			visitorFields: true,
			visitors: visitors,
			equipment: equipment,
			rooms: rooms,
			eventTypes: eventTypes,
			staff: staff,
			item: {
				eventName: message ? req.body.eventName : null,
				description: message ? req.body.description : null,
				location: message ? req.body.location : null,
				date: message ? req.body.date ? moment(req.body.date).format('YYYY-MM-DDTHH:mm') : null : null,
				endDate: message ? req.body.endDate ? moment(req.body.endDate).format('YYYY-MM-DDTHH:mm') : null : null,
			},
			selectedEventType: message ? req.body.eventType : null,
			selectedStaff: message ? staff_use : null,
			selectedEquip: message ? equipment_use : null,
			selectedRooms: message ? rooms_use : null,
			selectedVisitors: message ? visitor_attending : null,
			user: req.user
		});

		resetErrorMessage();
	});
}
/* End Functions */

router.get('/archive/'+listLink, function (req, res) {
	let allEventTypes = genFunctions.getAllEventTypes();

	if (req.user && req.user.permission >= 1) {
		Archive.find({}, null, {sort: {date: -1}}, function (errArchive, archiveListDoc) {
			let eventList = [];

			if (!errArchive) {
				if(req.user.permission === 1){
					Visitor.findOne({_id:req.user._id},function(errFindVisitor,visitorDoc){
						if(errFindVisitor) console.log(errFindVisitor);

						if(visitorDoc){
							archiveListDoc.forEach(function (archive_event) {
								visitorDoc.attendedEvents.forEach(function(event){
									if(event.eventID === archive_event.eventID) {
										eventList.push({
											id: archive_event.eventID,
											name: archive_event.eventName
										});
									}
								});
							});

							listElement(res, req, allEventTypes, eventList, "archive");
						} else {
							res.redirect('/');
						}
					});
				} else if(req.user.permission >= 10){
					archiveListDoc.forEach(function (archive_event) {
						eventList.push({
							id: archive_event.eventID,
							name: archive_event.eventName
						});
					});
				}

				if(req.user.permission >= 10){
					listElement(res, req, allEventTypes, eventList, 'Archive Events List', "archive");
				}

				if (eventList.length <= 0) {
					error_msg = "No results to show.";
				}
			} else {
				console.log(errArchive);
				error_msg = "Unknown error occurred. Please try again.";
			}
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/participate-events-list', function (req, res) {
	let allEventTypes = genFunctions.getAllEventTypes();

	function getAttendingEvents(Document){
		let attendingEvents = [];

		Document.attendingEvents.forEach(function (attending_event) {
			attendingEvents.push(attending_event.eventID);
		});

		Event.find({_id: {$in: attendingEvents}}, null, {sort: {date: -1}}, function (err, events) {
			let eventList = [];

			events.forEach(function (event) {
				eventList.push({
					id: event._id,
					name: event.eventName,
				});
			});

			error_msg = eventList.length === 0 ? "No results to show" : "";

			listElement(res, req, allEventTypes, eventList.reverse(), 'Attending Events List', "participate");
		});
	}

	if (req.user && req.user.permission >= 10) {
		Staff.findOne({_id: req.user._id}, function (err, staffDoc) {
			if (err) console.log(err);

			getAttendingEvents(staffDoc);
		});
	} else if (req.user && req.user.permission === 1) {
		Visitor.findOne({_id: req.user._id}, function (err, visitorDoc) {
			if (err) console.log(err);

			getAttendingEvents(visitorDoc);
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/' + listLink, function (req, res) {
	if (req.user && req.user.permission >= 10) {
		let allEventTypes = genFunctions.getAllEventTypes();

		Event.find({}, null, {sort: {date: -1}}, function (err, events) {
			let eventList = [];

			events.forEach(function (event) {
				eventList.push({
					id: event._id,
					name: event.eventName,
				});
			});

			error_msg = eventList.length === 0 ? "No results to show" : "";

			listElement(res, req, allEventTypes, eventList.reverse(), 'Events List', "allList");
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/archive/view-archive-event', function (req, res) {
	if (req.user && (req.user.permission >= 10 || req.user.permission === 1)) {
		/* Logic to get info from database */
		Archive.findOne({eventID: req.query.id}, async function (err, event) {
			if (!err && event) {
				let attending = false;

				if (req.user.permission === 1) {
					event.visitors.forEach(function (visitor) {
						if (visitor.visitorID === req.user._id) {
							attending = true;
						}
					});
				}

				if (req.user.permission >= 10 || attending) {
					res.render('view', {
						title: 'Viewing archive event: ' + event.eventName,
						item: {
							ID: event._id,
							Name: event.eventName,
							Equipment: event.equipment,
							Rooms: event.rooms,
							"Event Spaces": event.numberOfSpaces,
							"Event Type": {eventTypeName:event.eventType},
							"Staff Chosen": event.staffChosen,
							Date: event.date,
							"End Date": event.endDate ? event.endDate : "",
							Location: event.location,
							Visitors: event.visitors
						},
						listLink: listLink,
						deleteLink: req.user.permission >= 30 ? '/events/archive/'+deleteLink+'?id='+event._id : null,
						user: req.user
					});
				} else {
					res.redirect('participate-events-list');
				}

				resetErrorMessage();
			} else {
				console.log(err);
				res.render('view', {
					error: "Event not found!",
					listLink: listLink,
					user: req.user
				});

				resetErrorMessage();
			}
		});
		/* End Logic to get info from database */
	}
});

router.get('/' + viewLink, function (req, res) {
	if (req.user && (req.user.permission >= 10 || req.user.permission === 1)) {
		/* Logic to get info from database */
		Event.findOne({_id: req.query.id}, async function (err, event) {
			if (!err && event) {
				let attending = false;

				if (req.user.permission === 1) {
					event.visitors.forEach(function (visitor) {
						if (visitor.visitorID === req.user._id.toString()) {
							attending = true;
						}
					});
				}

				if (req.user.permission >= 10 || attending) {
					let equipment = await genFunctions.getEquipmentInfo(event.equipment);
					let rooms = await genFunctions.getRoomInfo(event.rooms);
					let event_type = await genFunctions.getEventType(event.eventTypeID);
					let staff = await genFunctions.getStaffInfo(event.staffChosen);
					let visitors = await genFunctions.getVisitorInfo(event.visitors);
					let numberOfSpaces = 0;
					let numberOfVisitors = 0;

					Promise.all([equipment, rooms, event_type, staff, visitors]).then(() => {
						let signedUp = false;
						rooms.forEach(function (room) {
							numberOfSpaces = numberOfSpaces + room.capacity;
						});

						visitors.forEach(function (visitor) {
							visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : "";
						});

						staff.forEach(function (staff_member){//
							console.log(staff_member._id.toString() === req.user._id.toString());
							if(staff_member._id.toString() === req.user._id.toString()) signedUp = true;
						});

						res.render('view', {
							title: 'Viewing event: ' + event.eventName,
							item: {
								ID: event._id,
								Name: event.eventName,
								Equipment: equipment,
								Rooms: rooms,
								"Event Spaces": numberOfSpaces,
								"Event Type": event_type,
								"Staff Chosen": staff,
								Date: event.date,
								"End Date": event.endDate ? event.endDate : "",
								Location: event.location,
								Visitors: visitors,
								"Total Visitors": numberOfVisitors
							},
							signUpLink: !signedUp && req.user.permission >= 10 ? signUpLink : null,
							listLink: req.user.permission >= 10 ? listLink : 'participate-events-list',
							deleteLink: req.user.permission >= 30 ? deleteLink+'?id='+event._id : null,
							editLink: req.user.permission >= 20 ? editLink + '?id=' + event._id : null,
							user: req.user
						});

						resetErrorMessage();
					});
				} else {
					res.redirect('participate-events-list');

					resetErrorMessage();
				}
			} else {
				console.log(err);
				res.render('view', {
					error: "Event not found!",
					listLink: listLink,
					user: req.user
				});

				resetErrorMessage();

			}
		});
		/* End Logic to get info from database */
	}
});

router.get('/' + editLink, function (req, res) {
	if (req.user && req.user.permission >= 20) {
		Event.findOne({_id: req.query.id}, async function (err, event) {
			if (!err && event) {
				let equipment_use = await genFunctions.getEquipmentInfo(event.equipment);
				let rooms_use = await genFunctions.getRoomInfo(event.rooms);
				let event_type = await genFunctions.getEventType(event.eventTypeID);
				let staff_use = await genFunctions.getStaffInfo(event.staffChosen);
				let visitor_attending = await genFunctions.getVisitorInfo(event.visitors);
				let visitors = await genFunctions.getAllVisitor();
				let equipment = await genFunctions.getAllEquipment();
				let rooms = await genFunctions.getAllRooms();
				let staff = await genFunctions.getAllStaff();
				let eventTypes = await genFunctions.getAllEventTypes();

				Promise.all([equipment, equipment_use, rooms_use, event_type, staff, staff_use, visitors, visitor_attending, eventTypes, rooms]).then(() => {
					let numberOfSpaces = 0;
					let numberOfVisitors = 0;
					let event_object = {
						_id: event._id,
						eventName: event.eventName,
						eventDescription: event.eventDescription,
						date: moment(event.date).format('YYYY-MM-DDTHH:mm'),
						endDate: event.endDate ? moment(event.endDate).format('YYYY-MM-DDTHH:mm') : "",
						eventType: event_type,
						location: event.location
					};

					rooms.forEach(function (room) {
						numberOfSpaces = numberOfSpaces + room.capacity;
					});

					visitors.forEach(function (visitor) {
						visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : "";
					});

					equipment_use.forEach(function (equip) {
						equip.quantity = equip.quantity + equip.reqQty;
					});

					if (numberOfSpaces < numberOfVisitors) error_msg = 'Not enough spaces are assigned for the event';

					renderEdit(res, req, event_object, equipment_use, rooms_use, staff_use, visitor_attending, eventTypes, staff, equipment, rooms, visitors);
				});
			} else {
				res.render('view', {
					error: "Event not found!",
					listLink: listLink,
					user: req.user
				});

				resetErrorMessage();
			}
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.post('/' + editLink, function (req, res) {
	function getPostedEquipment(req) {
		let equipment_posted = [];

		for (const [field_post_key, field_post_value] of Object.entries(req.body)) {
			if (req.body.hasOwnProperty(field_post_key)) {
				if (field_post_key.includes('equipment')) {
					equipment_posted.push({
						_id: field_post_value,
						equipID: field_post_value,
						reqQty: 1
					});
				} else if (field_post_key.includes('quantity')) {
					if(field_post_value !== '') {
						equipment_posted[equipment_posted.length - 1]['reqQty'] = parseInt(field_post_value);
					} else equipment_posted[equipment_posted.length - 1]['reqQty'] = 0;
				}
			}
		}

		return equipment_posted;
	}

	if (req.user && req.user.permission >= 20) {
		Event.findOne({_id: req.body.id}, async function (errFindEvent, event) {
			if (!errFindEvent && event) {
				let equipment_use = await genFunctions.getEquipmentInfo(event.equipment);
				let event_type = await genFunctions.getEventType(event.eventTypeID);
				let staff_use = await genFunctions.getStaffInfo(event.staffChosen);
				let visitor_attending = await genFunctions.getVisitorInfo(event.visitors);
				let visitors = await genFunctions.getAllVisitor();
				let equipment = await genFunctions.getAllEquipment();
				let rooms = await genFunctions.getAllRooms();
				let staff = await genFunctions.getAllStaff();
				let eventTypes = await genFunctions.getAllEventTypes();

				let promisesUpdate = [];
				let repostedEquip = [];
				let equipmentNotUpdated = [];
				let equipmentNotUpdatedNames = [];
				let roomNotUpdated = [];
				let roomNotUpdatedNames = [];
				let previousQuantity = [];

				let posted_staff_use = getPostedStaff(req);
				let posted_visitors = getPostedVisitors(req);
				let posted_equipment = getPostedEquipment(req);
				let posted_rooms = getPostedRooms(req);

				Promise.all([equipment, rooms, equipment_use, event_type, staff, staff_use, visitors, visitor_attending, eventTypes]).then(() => {
					let numberOfSpaces = 0;
					let numberOfVisitors = 0;

					if (req.body.date) {
						posted_rooms.forEach(function (room) {
							promisesUpdate.push(new Promise(function (resolve) {
								Room.findOne({_id: room._id}, function (errRoomFind, roomFindDoc) {
									if (errRoomFind) {
										console.log(errRoomFind);

										resolve();
									} else if (roomFindDoc) {
										let event_using_room = false;

										if(roomFindDoc.events.length > 0) {
											roomFindDoc.events.forEach(function (roomEvent) {
												/* Get time to midnight after the event end */
												let startDate = Date.parse(roomEvent.date);
												let endDate = roomEvent.endDate ? Date.parse(roomEvent.endDate) : null;
												let eventStartDate = Date.parse(req.body.date);
												let eventEndDate = req.body.endDate ? Date.parse(req.body.endDate) : null;
												let now = new Date();
												let year = now.getUTCFullYear();
												let month = now.getUTCMonth();
												let day = now.getUTCDate();

												let startDayHour = Date.UTC(year, month, day, 0, 0, 0, 0);
												let midnight = startDayHour + 86400000;

												let time_left = midnight - now.getTime();
												/* End Get time to midnight after the event end */

												if (roomEvent.eventID.toString() === event._id.toString()) event_using_room = true;

												if (((endDate && endDate < eventStartDate) ||
													(startDate && !endDate && ((!eventEndDate && startDate >= eventStartDate + time_left) ||
														(startDate + time_left <= eventStartDate) ||
														(eventEndDate && eventEndDate + time_left <= startDate)
													)))) {

													Room.updateOne({_id: room._id},
														{
															$push: {
																events: {
																	eventID: event._id,
																	eventName: event.eventName,
																	date: event.date,
																	endDate: event.endDate
																}
															}
														}, function (errUpdateRoom) {
															if (errUpdateRoom) {
																console.log("Error while updating room:" + errUpdateRoom);

																roomNotUpdated.push(room._id);
																roomNotUpdatedNames.push(room.roomName);
															}

															resolve();
														});
												} else if (event_using_room) {
													resolve();
												} else {
													roomNotUpdated.push(room._id);
													roomNotUpdatedNames.push(room.roomName);

													resolve();
												}
											});
										} else resolve();
									} else {
										roomNotUpdated.push(room._id);
										resolve();
									}
								});
							}));

							numberOfSpaces = numberOfSpaces + room.capacity;
						});
					}

					posted_visitors.forEach(function (visitor) {
						visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : "";
					});

					if (numberOfSpaces < numberOfVisitors) error_msg = 'Not enough spaces are assigned for the event';

					staff_use.forEach(function (prev_staff_member) {
						let staff_posted = false;

						posted_staff_use.forEach(function (posted_staff_member) {
							if (posted_staff_member.staffMemberID.toString() === prev_staff_member._id.toString()) staff_posted = true;
						});

						if (!staff_posted) {
							Staff.updateOne({_id: prev_staff_member._id}, {$pull: {attendingEvents: {eventID: event._id}}}, function (errorUpdateStaff) {
								if (!errorUpdateStaff) {
									Staff.findOne({_id: prev_staff_member._id}, function (errFind, staffMemberDoc) {
										if (!errFind) {
											if (staffMemberDoc) {
												genFunctions.sendNotification(staffMemberDoc._id, "Event Update", "You have been removed from an event.");
												genFunctions.sendEmail(staffMemberDoc.email, null, null, null, null, "removed").then().catch();
											} else {
												console.log("Staff member not found.");
											}
										} else {
											console.log(errFind);
										}
									});
								} else {
									console.log(errorUpdateStaff);
								}
							});
						}
					});

					posted_staff_use.forEach(function (posted_staff_member) {
						let new_staff = true;

						staff_use.forEach(function (prev_staff_member) {
							if (posted_staff_member.staffMemberID.toString() === prev_staff_member._id.toString()) new_staff = false;
						});

						if (new_staff) {
							Staff.findOne({_id: posted_staff_member.staffMemberID}, function (errorFindStaffEmail, staffDoc) {
								if (!errorFindStaffEmail) {
									genFunctions.sendNotification(staffDoc._id, "Event Participation", "You have been added to participate to an event.");
									genFunctions.sendEmail(staffDoc.email, null, null, null, null, "added").then().catch();
								} else {
									console.log(errorFindStaffEmail);
								}
							});
						}
					});

					visitor_attending.forEach(function (prev_visitor) {
						let visitor_posted = false;

						posted_visitors.forEach(function (posted_visitor) {
							if (posted_visitor.visitorID.toString() === prev_visitor._id.toString()) visitor_posted = true;
						});

						if (!visitor_posted) {
							Visitor.updateOne({_id: prev_visitor._id}, {$pull: {attendingEvents: {eventID: event._id}}}, function (errorUpdateVisitor) {
								if (errorUpdateVisitor) console.log(errorUpdateVisitor);
							});
						}
					});

					posted_visitors.forEach(function (posted_visitor) {
						let new_visitor = true;

						visitor_attending.forEach(function (prev_visitor) {
							if (posted_visitor.visitorID.toString() === prev_visitor._id.toString()) new_visitor = false;
						});

						if (new_visitor) {
							Visitor.findOne({_id: posted_visitor.visitorID}, function (errorFindVisitorEmail, visitorDoc) {
								if (!errorFindVisitorEmail) {
									genFunctions.sendNotification(visitorDoc._id, "Event Participation", "You have been added to participate to an event.");
									genFunctions.sendEmail(visitorDoc.contactEmail, null, null, null, null, "added").then().catch();
								} else {
									console.log(errorFindVisitorEmail);
								}
							});
						}
					});

					/* Check for re-posted equipment */
					equipment_use.forEach(function (prev_equip) {
						let equipment_posted = false;
						let equip_qty = 0;

						posted_equipment.forEach(function (posted_equip) {
							if (posted_equip.equipID.toString() === prev_equip._id.toString()) {
								equipment_posted = true;
								repostedEquip.push(posted_equip.equipID);
								equip_qty = prev_equip.reqQty - posted_equip.reqQty;
								posted_equip['quantity'] = prev_equip.quantity + posted_equip.reqQty + equip_qty;
							}
						});

						if (!equipment_posted) {
							if (prev_equip.reqQty > 0) {
								promisesUpdate.push(new Promise(function (resolve) {
									Equipment.findOne({_id: prev_equip._id}, function (errFindEquip, equipFindDoc) {
										if (errFindEquip) {
											console.log(errFindEquip);
											equipmentNotUpdated.push(prev_equip._id);

											resolve();
										} else if (equipFindDoc) {
											previousQuantity.push({
												equipID: prev_equip._id,
												quantity: equipFindDoc.quantity
											});

											Equipment.updateOne({_id: prev_equip._id}, {$set: {quantity: prev_equip.quantity + prev_equip.reqQty}}, function (errorUpdateEquip) {
												if (errorUpdateEquip) {
													equipmentNotUpdated.push(prev_equip._id);
													equipmentNotUpdatedNames.push(equipFindDoc.typeName);

													console.log(errorUpdateEquip);
												}

												resolve();
											});
										} else {
											equipmentNotUpdated.push(prev_equip._id);
											resolve();
										}
									});
								}));
							}
						} else if (equip_qty !== 0) {
							promisesUpdate.push(new Promise(function (resolve) {
								Equipment.findOne({_id: prev_equip._id}, function (errFindEquip, equipFindDoc) {
									if (!errFindEquip) {
										if (equipFindDoc && equipFindDoc.quantity - equip_qty >= 0) {
											previousQuantity.push({
												equipID: prev_equip._id,
												quantity: equipFindDoc.quantity
											});

											Equipment.updateOne({_id: prev_equip._id}, {$set: {quantity: equipFindDoc.quantity + equip_qty}}, function (errorUpdateEquip) {
												if (errorUpdateEquip) {
													equipmentNotUpdated.push(prev_equip._id);
													equipmentNotUpdatedNames.push(equipFindDoc.typeName);

													console.log(errorUpdateEquip);
												}

												resolve();
											});
										} else {
											console.log('Cannot update equipment, because insufficient quantity.');

											equipmentNotUpdated.push(prev_equip.equipID);
											equipmentNotUpdatedNames.push(equipFindDoc.typeName);

											resolve();
										}
									} else {
										console.log(errFindEquip);

										equipmentNotUpdated.push(prev_equip.equipID);
										equipmentNotUpdatedNames.push(equipFindDoc.typeName);

										resolve();
									}
								});
							}));
						}
					});

					/* End Check for re-posted equipment */

					posted_equipment.forEach(function (posted_equip) {
						if (!repostedEquip.includes(posted_equip.equipID)) { // check if equipment is re-posted
							promisesUpdate.push(new Promise(function (resolve) {
								Equipment.findOne({_id: posted_equip.equipID}, function (errFindEquip, equipFindDoc) {
									if (!errFindEquip) {
										if (equipFindDoc) {
											posted_equip['quantity'] = equipFindDoc.quantity;

											if (equipFindDoc.quantity - posted_equip.reqQty >= 0) {
												console.log(equipFindDoc.quantity - posted_equip.reqQty);
												Equipment.updateOne({_id: posted_equip.equipID}, {$inc: {quantity: -posted_equip.reqQty}}, function (errorUpdateEquip) {
													if (errorUpdateEquip) {
														console.log(errorUpdateEquip);

														equipmentNotUpdated.push(posted_equip.equipID);
														equipmentNotUpdatedNames.push(equipFindDoc.typeName);
													}

													resolve();
												});
											} else {
												console.log('Cannot update equipment, because insufficient quantity.');

												equipmentNotUpdated.push(posted_equip.equipID);
												equipmentNotUpdatedNames.push(equipFindDoc.typeName);

												resolve();
											}
										} else {
											console.log('Cannot update equipment, because insufficient quantity.');

											equipmentNotUpdated.push(posted_equip.equipID);
											equipmentNotUpdatedNames.push(equipFindDoc.typeName);

											resolve();
										}
									} else {
										console.log(errFindEquip);

										equipmentNotUpdated.push(posted_equip.equipID);
										equipmentNotUpdatedNames.push(equipFindDoc.typeName);

										resolve();
									}
								});
							}));
						}
					});

					Promise.all(promisesUpdate).then(function () {
						let event_object = {
							_id: event._id,
							eventName: req.body.eventName,
							eventDescription: req.body.description,
							date: moment(req.body.date).format('YYYY-MM-DDTHH:mm'),
							endDate: req.body.endDate ? moment(req.body.endDate).format('YYYY-MM-DDTHH:mm') : "",
							eventType: event_type._id,
							location: req.body.location
						};

						if (!(equipmentNotUpdated.length > 0) && !(roomNotUpdated.length > 0)) {
							let event_object_update = {
								$set: {
									eventName: event_object.eventName,
									equipment: posted_equipment,
									rooms: posted_rooms,
									eventTypeID: event_type._id,
									staffChosen: posted_staff_use,
									date: event.date,
									endDate: event.endDate,
									location: event.location,
									visitors: posted_visitors
								}
							};

							Event.updateOne({_id: req.body.id}, event_object_update, function (errEventUpdate,updateDoc) {
								if (!errEventUpdate) {
									/* Notifications and emails */
									posted_staff_use.forEach(function (staffMember) {
										Staff.findOne({_id: staffMember.staffMemberID}, function (errorStaffSendEmail, staffMemberDoc) {
											if (!errorStaffSendEmail) {
												let attending = false;

												staffMemberDoc.attendingEvents.forEach(function (attending_event) {
													if (attending_event.eventID.toString() === req.body.id.toString()) attending = true;
												});

												if (!attending) {
													Staff.updateOne({_id: staffMemberDoc._id}, {
														$push: {
															attendingEvents: {
																eventID: req.body.id,
																role: staffMember.role
															}
														}
													}, function (errUpdateStaff) {
														if (errUpdateStaff) console.log(errUpdateStaff);
													});
												}
												genFunctions.sendNotification(staffMemberDoc._id, "Event Update", "An event that you are participating has been updated.");
												genFunctions.sendEmail(staffMemberDoc.email, null, null, null, null, "edited").then().catch();
											}
										});
									});

									posted_visitors.forEach(function (visitor) {
										Visitor.findOne({_id: visitor.visitorID}, function (errorVisitorSendEmail, visitorDoc) {
											if (!errorVisitorSendEmail) {
												let attending = false;

												visitorDoc.attendingEvents.forEach(function (attending_event) {
													if (attending_event.eventID === req.body.id) attending = true;
												});

												if (!attending) {
													Visitor.updateOne({_id: visitorDoc._id}, {
														$push: {
															attendingEvents: {
																eventID: req.body.id,
																eventName:event_object.eventName}}}, function (errUpdateVisitor) {
														if (errUpdateVisitor) console.log(errUpdateVisitor);
													});
												}
												genFunctions.sendNotification(visitorDoc._id, "Event Update", "An event that you are participating has been updated.");
												genFunctions.sendEmail(visitorDoc.contactEmail, null, null, null, null, "edited").then().catch();
											}
										});
									});
									/* End Notifications and emails */

									message = "Successfully updated event: " + event.eventName;
								} else {
									console.log(errEventUpdate);
									error_msg = "Unknown error occurred, please try again.";

									recoverQuantity(previousQuantity);
									recoverRoomsAvailability(roomNotUpdated,req.body.id);
								}

								renderEdit(res, req, event_object, posted_equipment, posted_rooms, posted_staff_use, posted_visitors, eventTypes, staff, equipment, rooms, visitors);
							});
						} else {
							recoverQuantity(previousQuantity);
							recoverRoomsAvailability(roomNotUpdated,req.body.id);

							if (equipmentNotUpdatedNames.length > 0) {
								error_msg = 'Unable to edit event because the equipment with names: ';

								equipmentNotUpdatedNames.forEach(function (equipName) {
									error_msg = error_msg.concat('"' + equipName + '",');
								});

								error_msg = error_msg.concat(' have insufficient quantity, please revise all the data again and try to edit event again.');
							}

							renderEdit(res, req, event_object, posted_equipment, posted_rooms, posted_staff_use, posted_visitors, eventTypes, staff, equipment, rooms, visitors);
						}
					});
				});
			} else {
				console.log(errFindEvent);
				res.render('view', {
					error: "Event not found!",
					listLink: listLink,
					user: req.user
				});

				resetErrorMessage();
			}
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/archive/' + deleteLink, function (req, res) {
	if (req.user && req.user.permission >= 30) {
		genFunctions.deleteEvent(req.query.id, "archive",true).then(function (result) {
			res.render('view', {
				deleteMsg: result,
				listLink: listLink,
				user: req.user
			});

			resetErrorMessage();
		}).catch(function (error) {
			res.render('view', {
				error: error,
				listLink: listLink,
				user: req.user
			});

			resetErrorMessage();
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/' + deleteLink, function (req, res) {
	if (req.user && req.user.permission >= 30) {
		genFunctions.deleteEvent(req.query.id, "event-list",true).then(function (result) {
			res.render('view', {
				deleteMsg: result,
				listLink: listLink,
				user: req.user
			});

			resetErrorMessage();
		}).catch(function (error) {
			res.render('view', {
				error: error,
				listLink: listLink,
				user: req.user
			});

			resetErrorMessage();
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/' + addLink, async function (req, res) {
	if (req.user && req.user.permission >= 20) {
		renderAdd(res,req,null,null,null,null);
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.post('/' + addLink, async function (req, res) {
	if (req.user && req.user.permission >= 20) {
		let equipment_use = [];
		let rooms_use = getPostedRooms(req);
		let staff_use = getPostedStaff(req);
		let visitor_attending = getPostedVisitors(req);
		let numberOfSpaces = 0;
		let numberOfVisitors = 0;
		let promises = [];
		let equipmentNotUpdated = [];
		let equipmentNotUpdatedNames = [];
		let roomNotUpdated = [];
		let roomNotUpdatedNames = [];

		for (const [field_post_key, field_post_value] of Object.entries(req.body)) {
			if (req.body.hasOwnProperty(field_post_key)) {
				if (field_post_key.includes('equipment')) {
					equipment_use.push({
						equipID: field_post_value,
						reqQty: 1
					});
				} else if (field_post_key.includes('quantity')) {
					if(field_post_value !== '') {
						equipment_use[equipment_use.length - 1]['reqQty'] = parseInt(field_post_value);
					} else equipment_use[equipment_use.length - 1]['reqQty'] = 0;
				}
			}
		}

		equipment_use.forEach(function(equip){
			promises.push(new Promise(function (resolve) {
				Equipment.findOne({_id: equip.equipID}, function (errFindEquip, equipmentFoundDoc) {
					if (!errFindEquip) {
						if (equipmentFoundDoc && equipmentFoundDoc.quantity >= equip.reqQty) {
							let new_quantity = equipmentFoundDoc.quantity-equip.reqQty;
							Equipment.updateOne({_id: equip.equipID}, {$set: {quantity: new_quantity}}, function (err) {
								if (err) {
									console.log("Failed to update quantity for id:" + equip.equipID);
									console.log(err);
								}
								resolve();
							});
						} else {
							equipmentNotUpdated.push(equip.equipID);
							if (equipmentFoundDoc) equipmentNotUpdatedNames.push(equipmentFoundDoc.typeName);

							resolve();
						}
					} else {
						console.log(errFindEquip);
						resolve();
					}
				});
			}));
		});

		rooms_use.forEach(function (room) {
			numberOfSpaces = numberOfSpaces + room.capacity;
		});

		visitor_attending.forEach(function (visitor) {
			visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : "";
		});

		if (numberOfSpaces < numberOfVisitors) error_msg = 'Not enough spaces are assigned for the event';

		Promise.all(promises).then(function () {
			if (!(equipmentNotUpdated.length > 0)) {
				let new_event = new Event({
					eventName: req.body.eventName,
					eventDescription: req.body.description,
					equipment: equipment_use,
					rooms: rooms_use,
					eventTypeID: req.body.eventType,
					staffChosen: staff_use,
					date: req.body.date,
					endDate: req.body.endDate,
					location: req.body.location,
					visitors: visitor_attending
				});

				new_event.save(function (error, eventDoc) {
					if (!error) {
						rooms_use.forEach(function(room){
							let event_using_room = false;
							let update_validated = false;

							if(room.events) {
								room.events.forEach(function (roomEvent) {
									/* Get time to midnight after the event end */
									let startDate = Date.parse(roomEvent.date);
									let endDate = roomEvent.endDate ? Date.parse(roomEvent.endDate) : false;
									let eventStartDate = Date.parse(req.body.date);
									let eventEndDate = req.body.endDate ? Date.parse(req.body.endDate) : false;
									let now = new Date();
									let year = now.getUTCFullYear();
									let month = now.getUTCMonth();
									let day = now.getUTCDate();

									let startDayHour = Date.UTC(year, month, day, 0, 0, 0, 0);
									let midnight = startDayHour + 86400000;

									let time_left = midnight - now.getTime();
									/* End Get time to midnight after the event end */

									if (((endDate && endDate < eventStartDate) ||
										(startDate && !endDate && ((!eventEndDate && startDate >= eventStartDate + time_left) ||
											(startDate + time_left <= eventStartDate) ||
											(eventEndDate && eventEndDate + time_left <= startDate)
										)))) {

										update_validated = true;
									} else {
										roomNotUpdated.push(room._id);
										roomNotUpdatedNames.push(room.roomName);
									}
								});
							} else update_validated = true;

							if (update_validated) {
								promises.push(new Promise(function(resolve) {
									Room.updateOne({_id: room._id},
										{
											$push: {
												events: {
													eventID: eventDoc._id,
													eventName: eventDoc.eventName,
													date: eventDoc.date,
													endDate: eventDoc.endDate
												}
											}
										}, function (errUpdateRoom) {
											if (errUpdateRoom) {
												console.log(errUpdateRoom);

												roomNotUpdated.push(room._id);
												roomNotUpdatedNames.push(room.roomName);
											}

											resolve();
										});
								}));
							}
						});

						staff_use.forEach(function (staff_member) {
							Staff.findOne({_id: staff_member.staffMemberID}, function (err, staffDoc) {
								if (!err && staffDoc) {
									Staff.updateOne({_id: staff_member.staffMemberID}, {
										$push: {
											attendingEvents: {
												eventID: eventDoc._id,
												role: staff_member.role
											}
										}
									}, function (errUpdate, staffDoc) {
										if (errUpdate) {
											console.log(errUpdate);
										} else {
											genFunctions.sendNotification(staffDoc._id, "Participating Event", "You are a participant to a new event.");
											genFunctions.sendEmail(staffDoc.email, null, null, null, null, "added").then().catch();
										}
									});
								} else { // staff not found or error with database
									console.log(err);
								}
							});
						});

						visitor_attending.forEach(function (visitor_att) {
							Visitor.findOne({_id: visitor_att.visitorID}, function (err, visitorDoc) {
								if (!err && visitorDoc) {
									Visitor.updateOne({_id: visitor_att.visitorID}, {$push: {attendingEvents: {eventID: eventDoc._id,eventName:eventDoc.eventName}}}, function (errUpdate, visitorDoc) {
										if (errUpdate) {
											console.log(errUpdate);
										} else {
											genFunctions.sendNotification(visitorDoc._id, "Participating Event", "You are a participant to a new event.");
											genFunctions.sendEmail(visitorDoc.contactEmail, null, null, null, null, "added").then().catch();
										}
									});
								} else { // visitor not found or error with database
									console.log(err);
								}
							});
						});

						Promise.all(promises).then(function () {
							if(roomNotUpdated.length !== 0){
								recoverRoomsAvailability(rooms_use,eventDoc._id);

								genFunctions.deleteEvent(eventDoc._id,"events-list",false);

								error_msg = 'Unable to add event because rooms with names: ';

								roomNotUpdatedNames.forEach(function (roomName) {
									error_msg = error_msg.concat('"' + roomName + '",');
								});

								error_msg = error_msg.concat(' are not available, please revise all the data again and try to add event again.');
							} else {
								message = "Successfully create new event: " + req.body.eventName;
							}

							renderAdd(res,req,staff_use,equipment_use,rooms_use,visitor_attending);
						});
					} else {
						error_msg = validationErr(error);

						renderAdd(res,req,staff_use,equipment_use,rooms_use,visitor_attending);
					}
				});
			} else {
				recoverQuantity(equipment_use);

				if (equipmentNotUpdatedNames.length > 0) {
					error_msg = 'Unable to add event because the equipment with names: ';

					equipmentNotUpdatedNames.forEach(function (equipName) {
						error_msg = error_msg.concat('"' + equipName + '",');
					});

					error_msg = error_msg.concat(' have insufficient quantity, please revise all the data again and try to add event again.');
				}

				renderAdd(res,req,staff_use,equipment_use,rooms_use,visitor_attending);
			}
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/' + signUpLink, async function (req, res) {
	if (req.user && req.user.permission >= 10) {
		function errorRender(){
			res.render('view', {
				error: "Unknown error occurred while trying to sign you up for event. Please try again.",
				listLink: listLink,
				user: req.user
			});

			resetErrorMessage();
		}

		Event.findOne({_id:req.query.id},function(errFindEvent,eventDoc){
			if(errFindEvent){
				console.log(errFindEvent);

				errorRender();
			} else if(eventDoc){
				Staff.findOne({_id:req.user._id},function(errFindStaff,staffDoc){
					if(errFindStaff){
						console.log(errFindStaff);

						errorRender();
					} else if(staffDoc) {
						Staff.updateOne({_id: req.user._id}, {
							$push: {
								attendingEvents: {
									eventID: eventDoc._id,
									role: staffDoc.role
								}
							}
						}, function (errUpdate, staffDoc) {
							if (errUpdate) {
								console.log(errUpdate);
							} else {
								genFunctions.sendNotification(staffDoc._id, "Participating Event", "You are a participant to a new event.");
								genFunctions.sendEmail(staffDoc.email, null, null, null, null, "added").then().catch();
							}
						});

						Event.updateOne({_id: req.query.id}, {
							$push: {
								staffChosen: {
									staffMemberID: req.user._id,
									role: staffDoc.role
								}
							}
						}, function (errUpdate) {
							if (errUpdate) {
								console.log(errUpdate);

								errorRender();
							} else {
								res.render('view', {
									signUpMsg: "Successfully signed up for event:" + eventDoc.eventName + ".",
									listLink: listLink,
									user: req.user
								});

								resetErrorMessage();
							}
						});
					} else {
						res.redirect('/');

						resetErrorMessage();
					}
				});
			} else {
				res.render('view', {
					error: "Event not found.",
					listLink: listLink,
					user: req.user
				});

				resetErrorMessage();
			}
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

module.exports = router;
