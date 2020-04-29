/**
 * Author: Lyuboslav Velikov
 * ID: 201186573
 * University of Liverpool
 * This file is used to handle all the routes that are
 * used to manipulate or insert data for the events
 * @type {createApplication} is the main route handler (router)
 */

const express = require('express');
const router = express.Router(); // used for the route requests and results
const moment = require('moment'); // convert the date to specific format so that the date fields can read it
const genFunctions = require('../functions/generalFunctions'); // general functions used to manipulate and fetch data
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

/* Links of the routes for manipulating the events */
let editLink = "edit-event";
let viewLink = "view-event";
let addLink = "add-event";
let deleteLink = "delete-event";
let listLink = "list-events";
let exportLink = "../export?type=Events";
let signUpLink = "sign-up-event";
/* End Links of the routes for manipulating the events */

/* Feedback Messages */
let error_msg = null;
let message = null;
/* End Feedback Messages */
let columns = ["ID", "Event Name", "Options"]; // used as headers for the list template rendering

/**
 * Vapid details are required for the push notifications.
 * They authenticate the server that is sending them.
 */
webpush.setVapidDetails(
	"mailto:sglvelik@liv.ac.uk",
	process.env.PUBLIC_VAPID_KEY,
	process.env.PRIVATE_VAPID_KEY
);

/* Functions */
/**
 * Function for structuring the data returned by MongoDB validation
 * @param error Passing the error so it can be checked what is it actually
 * @returns {string} The error that has to be printed
 */
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

/**
 * Reset the global fields that are used for this route
 */
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

/**
 * Function to get the posted staff members into an object as they have to be added to the database
 * @param req The request that has been made by the user
 * @returns {Array} The resulting set of staff members
 */
function getPostedStaff(req) {
	let staff_use = []; // store the staff members in this array

	for (const [field_post_key, field_post_value] of Object.entries(req.body)) { // iterate through the request fields that have been entered
		if (req.body.hasOwnProperty(field_post_key)) { // if has the key iterated to
			if (field_post_key.includes('staffID')) { // if it includes the staff id
				staff_use.push({ // add the staff member object to the array
					_id: field_post_value,
					staffMemberID: field_post_value,
					role: ""
				});
			} else if (field_post_key.includes('staffRole')) { // if includes the staff member role
				staff_use[staff_use.length - 1]['role'] = field_post_value; // then the value should be added to the staff member object
			}
		}
	}

	return staff_use; // return the array of staff members
}

/**
 * Function to get the posted visitors into an object as they have to be added to the database
 * @param req The request that has been made by the user
 * @returns {Array} The resulting set of visitors
 */
function getPostedVisitors(req) {
	let visitor_attending = []; // store the visitors in this array

	for (let [field_post_key, field_post_value] of Object.entries(req.body)) { // iterate through the request fields that have been entered
		if (req.body.hasOwnProperty(field_post_key)) { // if has the key iterated to
			if (field_post_key.includes('visitor')) { // if it includes the visitor id
				visitor_attending.push({ // add the visitor object to the array
					_id: field_post_value,
					visitorID: field_post_value
				});
			}
		}
	}

	return visitor_attending; // return the array of visitors
}

/**
 * Function to get the equipment entered into objects as they have to be added to the database
 * @param req The request that has been made by the user
 * @returns {Array} The resulting set of equipment
 */
function getPostedEquipment(req) {
	let equipment_posted = []; // store the equipment in this array

	for (const [field_post_key, field_post_value] of Object.entries(req.body)) { // iterate through the request fields that have been entered
		if (req.body.hasOwnProperty(field_post_key)) { // if has the key iterated to
			if (field_post_key.includes('equipment')) { // if the field key includes the word equipment
				equipment_posted.push({ // add the equipment object to the array
					_id: field_post_value,
					equipID: field_post_value,
					reqQty: 1
				});
			} else if (field_post_key.includes('quantity')) { // if the field key includes the word quantity
				if(field_post_value !== '') { // check if something has been entered
					equipment_posted[equipment_posted.length - 1]['reqQty'] = parseInt(field_post_value); // put the required quantity in the object
				} else equipment_posted[equipment_posted.length - 1]['reqQty'] = 0; // if nothing has been entered set the required quantity of the equipment object to 0
			}
		}
	}

	return equipment_posted; // return the array of equipment objects
}

/**
 * Function to get the posted rooms into an object as they have to be added to the database
 * @param req The request that has been made by the user
 * @returns {Array} The resulting set of rooms
 */
function getPostedRooms(req) {
	let rooms_used = []; // store the rooms in this array

	for (const [field_post_key, field_post_value] of Object.entries(req.body)) { // iterate through the request fields that have been entered
		if (req.body.hasOwnProperty(field_post_key)) { // if has the key iterated to
			if (field_post_key.includes('roomID')) { // if it includes the room id
				rooms_used.push({ // add the room object to the array
					_id: field_post_value,
					roomID: field_post_value
				});
			}
		}
	}

	return rooms_used; // return the array of rooms
}

/**
 * Function to recover the quantity of all the updated equipment
 * @param previousQuantity is the quantity that was available before the update
 */
function recoverQuantity(previousQuantity) {
	for (let i = 0; i < previousQuantity.length; i++) { // iterate through all of the equipment that has been saved in previous quantity array
		Equipment.updateOne({_id: previousQuantity[i]['equipID']}, {$set: {quantity: previousQuantity[i]['quantity']}}, function (err) { // revert the equipment quantity
			if (err) {
				console.log(err); // if error occurs print it (used for debugging)
			}
		});
	}
}

/**
 * Function to recover the availability of all the updated rooms
 * @param rooms rooms that were updated
 * @param eventID the event id that had to be inserted or edited
 */
function recoverRoomsAvailability(rooms,eventID){
	rooms.forEach(function(room){ // iterate through all of the rooms that have been updated
		Room.updateOne({_id: room}, {$pull: {events: {eventID:eventID}}}, function (err) {
			if (err) {
				console.log(err); // if error occurs print it (used for debugging)
			}
		});
	});
}

/**
 * Remove the event from the attending events of the staff member
 * @param staffID The staff member id that has to be updated in the database
 * @param eventID The event id that has to be removed from the staff member
 */
function removeStaffEvent(staffID,eventID){
	Staff.updateOne({_id: staffID}, {$pull: {attendingEvents: {eventID: eventID}}}, function (errorUpdateStaff) {
		if (errorUpdateStaff) console.log(errorUpdateStaff); // error while updating staff member
	});
}

/**
 * Remove the event from the attending events of the visitor
 * @param visitorID The visitor id that has to be updated in the database
 * @param eventID The event id that has to be removed from the visitor
 */
function removeVisitorEvent(visitorID,eventID){
	Visitor.updateOne({_id: visitorID}, {$pull: {attendingEvents: {eventID: eventID}}}, function (errorUpdateVisitor) {
		if (errorUpdateVisitor) console.log(errorUpdateVisitor); // error while updating visitor
	});
}

/**
 * Function to list the events depending on which route has been executed
 * @param res The result of the request (rendering the template)
 * @param req The request that has been made to the route
 * @param allEventTypes The event types stored into the database
 * @param eventList The events that have to be listed
 * @param title The title of the template
 * @param type The type of the list that has to be rendered
 */
function listElement(res, req, allEventTypes, eventList, title, type) {
	allEventTypes.then(function (eventTypes) { // when the event types have been fetched from the database
		if(type === "archive"){ // check if archive has not been requested for rendering
			exportLink = '../../export?type=Archive Events';
			deleteLink = '/events/archive/' + deleteLink;
			viewLink = 'view-archive-event';
			editLink = null;
			addLink = null;
		}

		/* Render Template */
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
		/* End Render Template */

		resetErrorMessage(); // reset global variables
	});
}

/**
 * Render the add-edit template with the details for editing
 * @param res The result that has to be shown to the user (the template in our case)
 * @param req The request that has been made by the user
 * @param event The event object which has the information required for the fields
 * @param posted_equipment The posted equipment which is going to be used to update
 * @param posted_rooms The posted rooms which are going to be used to update
 * @param posted_staff_use The posted staff members which are going to be used to update
 * @param posted_visitors The posted visitors which are going to be used to update
 * @param eventTypes All the event types from the database
 * @param staff All the staff members from the database
 * @param equipment All the equipment from the database
 * @param rooms All the rooms from the database
 * @param visitors All the visitors from the database
 */
function renderEdit(res, req, event, posted_equipment, posted_rooms, posted_staff_use, posted_visitors, eventTypes, staff, equipment, rooms, visitors) {
	// fields that have to be entered
	let fields = [{name: "ID", type: "text", identifier: "id", readonly:true},
		{name: "Event Name", type: "text", identifier: "eventName"},
		{name: "Description", type: "textarea", identifier: "description"},
		{name: "Location", type: "text", identifier: "location"},
		{name: "Date", type: "datetime-local", identifier: "date"},
		{name: "End Date", type: "datetime-local", identifier: "endDate"},
		{name: "Event Type", type: "select", identifier: "eventType"}];

	/* Render Template */
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
	/* End Render Template */

	resetErrorMessage(); // reset global variables
}

/**
 * Render the add-edit template with the details for adding
 * @param res The result that has to be shown to the user (the template in our case)
 * @param req The request that has been made by the user
 * @param staff_use The posted staff members which were inserted into the database
 * @param equipment_use The posted equipment which was inserted into the database
 * @param rooms_use The posted rooms which were inserted into the database
 * @param visitor_attending The posted visitors which were inserted into the database
 * @returns {Promise<void>}
 */
async function renderAdd(res, req, staff_use, equipment_use, rooms_use, visitor_attending) {
	// fields that have to be entered
	let fields = [{name: "Event Name", type: "text", identifier: "eventName"},
		{name: "Description", type: "textarea", identifier: "description"},
		{name: "Location", type: "text", identifier: "location"},
		{name: "Date", type: "datetime-local", identifier: "date"},
		{name: "End Date", type: "datetime-local", identifier: "endDate"},
		{name: "Event Type", type: "select", identifier: "eventType"}];

	let visitors = await genFunctions.getAllVisitor(); // get all visitors information from the database
	let equipment = await genFunctions.getAllEquipment(); // get all equipment information from the database
	let rooms = await genFunctions.getAllRooms(); // get all rooms information from the database
	let staff = await genFunctions.getAllStaff(); // get all staff members information from the database
	let eventTypes = await genFunctions.getAllEventTypes(); // get all the event types from the database

	// when all the promises are resolved
	Promise.all([equipment, rooms, eventTypes, visitors, staff]).then(() => {
		/* Render Template */
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
				eventName: error_msg ? req.body.eventName : null,
				description: error_msg ? req.body.description : null,
				location: error_msg ? req.body.location : null,
				date: error_msg ? req.body.date ? moment(req.body.date).format('YYYY-MM-DDTHH:mm') : null : null,
				endDate: error_msg ? req.body.endDate ? moment(req.body.endDate).format('YYYY-MM-DDTHH:mm') : null : null,
			},
			selectedEventType: error_msg ? req.body.eventType : null,
			selectedStaff: error_msg ? staff_use : null,
			selectedEquip: error_msg ? equipment_use : null,
			selectedRooms: error_msg ? rooms_use : null,
			selectedVisitors: error_msg ? visitor_attending : null,
			user: req.user
		});
		/* End Render Template */

		resetErrorMessage(); // reset global variables
	});
}
/* End Functions */

/**
 * The Archive List route is used to list the archived events
 * in the list template
 */
router.get('/archive/'+listLink, function (req, res) {
	let allEventTypes = genFunctions.getAllEventTypes(); // get all the event types from the database

	if (req.user && req.user.permission >= 1) { // check if user is authenticated
		Archive.find({}, null, {sort: {date: -1}}, function (errArchive, archiveListDoc) { // get the list of archived events (descending sort)
			let eventList = []; // store the events list here

			if (!errArchive) { // check if there are any errors
				if(req.user.permission === 1){ // check if the user is a visitor
					Visitor.findOne({_id:req.user._id},function(errFindVisitor,visitorDoc){ // find the visitor information from the database
						if(errFindVisitor) console.log(errFindVisitor); // error while finding visitor in database

						if(visitorDoc){ // if user found
							archiveListDoc.forEach(function (archive_event) { // iterate through all the documents
								visitorDoc.attendedEvents.forEach(function(event){ // iterate through attended events of the visitor
									if(event.eventID === archive_event.eventID) { // check if the id of the archived event matches the attended event's id
										eventList.push({ // add the event object to the array
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
				} else if(req.user.permission >= 10){ // check if the user is a staff member
					archiveListDoc.forEach(function (archive_event) { // iterate through all the documents
						eventList.push({ // add the event object to the array
							id: archive_event.eventID,
							name: archive_event.eventName
						});
					});

					listElement(res, req, allEventTypes, eventList, 'Archive Events List', "archive"); // render list
				}

				if (eventList.length <= 0) { // no events were added to the array
					error_msg = "No results to show.";
				}
			} else { // error while fetching data
				console.log(errArchive);
				error_msg = "Unknown error occurred. Please try again.";
			}
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset global variables
	}
});

/**
 * The Participate List route is used to list the events that a user is participating to
 * in the list template
 */
router.get('/participate-events-list', function (req, res) {
	let allEventTypes = genFunctions.getAllEventTypes(); // get all the event types from the database

	/**
	 * This function gets all the events that the user attends to
	 * @param Document The user type that have to search for attending events
	 */
	function getAttendingEvents(Document){
		let attendingEvents = []; // store the attending events ids here

		Document.attendingEvents.forEach(function (attending_event) { // iterate through all attending events
			attendingEvents.push(attending_event.eventID); // add the event id to the attending events array
		});

		Event.find({_id: {$in: attendingEvents}}, null, {sort: {date: -1}}, function (err, events) { // find all the events from the array
			let eventList = []; // store the event objects here

			events.forEach(function (event) { // iterate through all the events
				eventList.push({ // push the object with the necessary information here
					id: event._id,
					name: event.eventName,
				});
			});

			error_msg = eventList.length === 0 ? "No results to show" : ""; // no events were found in the database message

			listElement(res, req, allEventTypes, eventList.reverse(), 'Attending Events List', "participate"); // render list
		});
	}

	if (req.user && req.user.permission >= 10) { // check if the user is a staff member
		Staff.findOne({_id: req.user._id}, function (err, staffDoc) { // find the staff member
			if (err) console.log(err); // error while fetching staff member

			getAttendingEvents(staffDoc); // send the document to the function to find attending events
		});
	} else if (req.user && req.user.permission === 1) { // check if the user is a visitor
		Visitor.findOne({_id: req.user._id}, function (err, visitorDoc) { // find the visitor
			if (err) console.log(err); // error while fetching visitor

			getAttendingEvents(visitorDoc); // send the document to the function to find attending events
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset global variables
	}
});

/**
 * The List route is used to list all the events
 * in the list template
 */
router.get('/' + listLink, function (req, res) {
	if (req.user && req.user.permission >= 10) { // check if the user has permissions
		let allEventTypes = genFunctions.getAllEventTypes(); // get all the event types from the database

		Event.find({}, null, {sort: {date: -1}}, function (err, events) { // get all the events from the database (descending sort)
			let eventList = []; // store the events list here

			events.forEach(function (event) { // iterate through all the events
				eventList.push({ // push the object with the necessary information here
					id: event._id,
					name: event.eventName,
				});
			});

			error_msg = eventList.length === 0 ? "No results to show" : ""; // no events were found in the database message

			listElement(res, req, allEventTypes, eventList.reverse(), 'Events List', "allList"); // render list
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset global variables
	}
});

/**
 * The View Archive Event route is used to view the information about the specific archived event
 * in the view template
 */
router.get('/archive/view-archive-event', function (req, res) {
	if (req.user && (req.user.permission >= 10 || req.user.permission === 1)) { // check if user has permissions
		/* Logic to get info from database */
		Archive.findOne({eventID: req.query.id}, async function (err, event) { // get the event information from the database
			if (!err && event) {
				let attending = false; // check if attending the event

				if (req.user.permission === 1) { // check if user is a visitor
					event.visitors.forEach(function (visitor) { // iterate through the list of visitors for the event
						if (visitor.visitorID === req.user._id) { // if the visitor id is in the list of visitors
							attending = true;
						}
					});
				}

				if (req.user.permission >= 10 || attending) { // if the user is a staff member or a participating visitor
					/* Render Template */
					res.render('view', {
						title: 'Viewing archive event: ' + event.eventName,
						item: {
							ID: event.eventID,
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
						calendarLink: '../../calendar',
						deleteLink: req.user.permission >= 30 ? '/events/archive/'+deleteLink+'?id='+event._id : null,
						user: req.user
					});
					/* End Render Template */
				} else { // Insufficient permission level
					res.redirect('participate-events-list');
				}

				resetErrorMessage(); // reset global variables
			} else { // error or event not found
				console.log(err);
				/* Render Template */
				res.render('view', {
					error: "Event not found!",
					listLink: listLink,
					calendarLink: '../calendar',
					user: req.user
				});
				/* End Render Template */

				resetErrorMessage(); // reset global variables
			}
		});
		/* End Logic to get info from database */
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset global variables
	}
});

/**
 * The View Event route is used to view the information about the specific event
 * in the view template
 */
router.get('/' + viewLink, function (req, res) {
	if (req.user && (req.user.permission >= 10 || req.user.permission === 1)) { // check if user has permissions
		/* Logic to get info from database */
		Event.findOne({_id: req.query.id}, async function (err, event) { // fetch event from database
			if (!err && event) {
				let attending = false; // check if attending the event

				if (req.user.permission === 1) { // check if user is a visitor
					event.visitors.forEach(function (visitor) { // iterate through the list of visitors for the event
						if (visitor.visitorID === req.user._id.toString()) { // if the visitor id is in the list of visitors
							attending = true;
						}
					});
				}

				if (req.user.permission >= 10 || attending) { // if the user is a staff member or a participating visitor
					let equipment = await genFunctions.getEquipmentInfo(event.equipment); // get the equipment info used for the event
					let rooms = await genFunctions.getRoomInfo(event.rooms); // get the room info used for the event
					let event_type = await genFunctions.getEventType(event.eventTypeID); // get event type info selected for the event
					let staff = await genFunctions.getStaffInfo(event.staffChosen); // get staff members info that are chosen for the event
					let visitors = await genFunctions.getVisitorInfo(event.visitors); // get visitors info that are chosen for the event
					let numberOfSpaces = 0; // used to count the number of spaces
					let numberOfVisitors = 0; // used to count the number of visitors

					Promise.all([equipment, rooms, event_type, staff, visitors]).then(() => { // once all promises are resolved
						let signedUp = false; // check if the user has signed up for the event

						rooms.forEach(function (room) { // iterate through all the rooms used for the event
							numberOfSpaces = numberOfSpaces + room.capacity; // increment the number of spaces
						});

						visitors.forEach(function (visitor) { // iterate through all the visitors used for the event
							visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : ""; // increment the number of visitors
						});

						staff.forEach(function (staff_member){ // iterate through all the staff members used for the event
							if(staff_member._id.toString() === req.user._id.toString()) signedUp = true; // check if the user id matches the staff member attending the event
						});

						/* Render Template */
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
							calendarLink: '../calendar',
							deleteLink: req.user.permission >= 30 ? deleteLink+'?id='+event._id : null,
							editLink: req.user.permission >= 20 ? editLink + '?id=' + event._id : null,
							user: req.user
						});
						/* End Render Template */

						resetErrorMessage(); // reset global variables
					});
				} else { // Insufficient permission level
					res.redirect('participate-events-list');

					resetErrorMessage(); // reset global variables
				}
			} else { // error or event not found
				console.log(err);
				/* Render Template */
				res.render('view', {
					error: "Event not found!",
					listLink: listLink,
					calendarLink: '../calendar',
					user: req.user
				});
				/* End Render Template */

				resetErrorMessage(); // reset global variables

			}
		});
		/* End Logic to get info from database */
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset global variables
	}
});

/**
 * The Edit route with a get method used to display the information
 * into the fields that have to be entered in order to edit an event
 * in the add-edit template
 */
router.get('/' + editLink, function (req, res) {
	if (req.user && req.user.permission >= 20) { // check if user has permissions
		Event.findOne({_id: req.query.id}, async function (err, event) { // fetch event from database
			if (!err && event) {
				let equipment_use = await genFunctions.getEquipmentInfo(event.equipment); // get the equipment info used for the event
				let rooms_use = await genFunctions.getRoomInfo(event.rooms); // get the room info used for the event
				let event_type = await genFunctions.getEventType(event.eventTypeID); // get event type info selected for the event
				let staff_use = await genFunctions.getStaffInfo(event.staffChosen); // get staff members info that are chosen for the event
				let visitor_attending = await genFunctions.getVisitorInfo(event.visitors); // get visitors info that are chosen for the event
				let visitors = await genFunctions.getAllVisitor(); // get all visitors information from the database
				let equipment = await genFunctions.getAllEquipment(); // get all equipment information from the database
				let rooms = await genFunctions.getAllRooms(); // get all rooms information from the database
				let staff = await genFunctions.getAllStaff(); // get all staff members information from the database
				let eventTypes = await genFunctions.getAllEventTypes(); // get all the event types from the database

				// when all the promises are resolved
				Promise.all([equipment, equipment_use, rooms_use, event_type, staff, staff_use, visitors, visitor_attending, eventTypes, rooms]).then(() => {
					let numberOfSpaces = 0; // count the number of spaces
					let numberOfVisitors = 0; // count the number of visitors
					let event_object = { // event object to store info from database
						_id: event._id,
						eventName: event.eventName,
						eventDescription: event.eventDescription,
						date: moment(event.date).format('YYYY-MM-DDTHH:mm'),
						endDate: event.endDate ? moment(event.endDate).format('YYYY-MM-DDTHH:mm') : "",
						eventType: event_type,
						location: event.location
					};

					rooms.forEach(function (room) { // iterate through all the rooms used for the event
						numberOfSpaces = numberOfSpaces + room.capacity; // increment the number of spaces
					});

					visitors.forEach(function (visitor) { // iterate through all the visitors used for the event
						visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : ""; // increment the number of visitors
					});

					equipment_use.forEach(function (equip) { // iterate through all the equipment used for the event
						equip.quantity = equip.quantity + equip.reqQty; // the quantity of the equipment
					});

					if (numberOfSpaces < numberOfVisitors) error_msg = 'Not enough spaces are assigned for the event'; // error if the spaces are less than the number of visitors

					renderEdit(res, req, event_object, equipment_use, rooms_use, staff_use, visitor_attending, eventTypes, staff, equipment, rooms, visitors); // render add-edit
				});
			} else { // error or event not found
				/* Render Template */
				res.render('view', {
					error: "Event not found!",
					listLink: listLink,
					user: req.user
				});
				/* End Render Template */

				resetErrorMessage(); // reset global variables
			}
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset global variables
	}
});

/**
 * The Edit route with a post method used to update the information
 * from the database and populate the fields if another edit will be required
 * in the add-edit template
 */
router.post('/' + editLink, function (req, res) {
	if (req.user && req.user.permission >= 20) { // check if user has permissions
		Event.findOne({_id: req.body.id}, async function (errFindEvent, event) { // fetch event from database
			if (!errFindEvent && event) { // check if event has been found or an error occurred
				let equipment_use = await genFunctions.getEquipmentInfo(event.equipment); // get the equipment info used for the event
				let event_type = await genFunctions.getEventType(event.eventTypeID); // get event type info selected for the event
				let staff_use = await genFunctions.getStaffInfo(event.staffChosen); // get staff members info that are chosen for the event
				let visitor_attending = await genFunctions.getVisitorInfo(event.visitors); // get visitors info that are chosen for the event
				let visitors = await genFunctions.getAllVisitor(); // get all visitors information from the database
				let equipment = await genFunctions.getAllEquipment(); // get all equipment information from the database
				let rooms = await genFunctions.getAllRooms(); // get all rooms information from the database
				let staff = await genFunctions.getAllStaff(); // get all staff members information from the database
				let eventTypes = await genFunctions.getAllEventTypes(); // get all the event types from the database

				let promisesUpdate = []; // all updates that have to be resolved
				let repostedEquip = []; // store reposted equipment here
				let equipmentNotUpdated = []; // array of the equipment ids that are not updated
				let equipmentNotUpdatedNames = []; // array of the equipment names that are not updated
				let roomNotUpdated = []; // array of the room ids that are not updated
				let roomNotUpdatedNames = []; // array of the room names that are not updated
				let previousQuantity = []; // array to store the quantity of the equipment that is going to be updated

				let posted_staff_use = getPostedStaff(req); // get the posted staff members into an array
				let posted_visitors = getPostedVisitors(req); // get posted visitors into an array
				let posted_equipment = getPostedEquipment(req); // get posted equipment into an array
				let posted_rooms = getPostedRooms(req); // get posted rooms into an array

				// when all the promises are resolved
				Promise.all([equipment, rooms, equipment_use, event_type, staff, staff_use, visitors, visitor_attending, eventTypes]).then(() => {
					let numberOfSpaces = 0; // count number of spaces
					let numberOfVisitors = 0; // count number of visitors

					if (req.body.date) { // if the date of the event is input
						posted_rooms.forEach(function (room) { // iterate through posted rooms array
							promisesUpdate.push(new Promise(function (resolve) { // add the promise to the promises array
								Room.findOne({_id: room._id}, function (errRoomFind, roomFindDoc) { // fetch room from database
									if (errRoomFind) { // if there is an error while fetching data for the room from the database
										console.log(errRoomFind);

										resolve(); // resolve the promise for the update
									} else if (roomFindDoc) { // if the room is found
										let event_using_room = false; // check if the room is used during the date

										if(roomFindDoc.events.length > 0) { // if it has any events assigned to this room
											roomFindDoc.events.forEach(function (roomEvent) {
												/* Get time to midnight after the event end */
												// all times below are converted to milliseconds
												let startDate = Date.parse(roomEvent.date); // room event start date
												let endDate = roomEvent.endDate ? Date.parse(roomEvent.endDate) : null; // the room event end date
												let eventStartDate = Date.parse(req.body.date); // event (to be edited) start date
												let eventEndDate = req.body.endDate ? Date.parse(req.body.endDate) : null; // event (to be edited) end date
												let now = new Date(); // current time
												let year = now.getUTCFullYear(); // current year
												let month = now.getUTCMonth(); // current month
												let day = now.getUTCDate(); // current day

												let startDayHour = Date.UTC(year, month, day, 0, 0, 0, 0); // midnight for current date
												let midnight = startDayHour + 86400000; // midnight on the next day

												let time_left = midnight - now.getTime(); // time left to midnight
												/* End Get time to midnight after the event end */

												if (roomEvent.eventID.toString() === event._id.toString()) event_using_room = true; // event is already using this room

												// check if the event does not overlap with other events using the room at the same time
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
														}, function (errUpdateRoom) { // update the room
															if (errUpdateRoom) { // error while updating room
																console.log("Error while updating room:" + errUpdateRoom);

																roomNotUpdated.push(room._id); // push the room id into the array of not updated rooms
																roomNotUpdatedNames.push(room.roomName); // push the room name into the array of not updated rooms
															}

															resolve(); // resolve the update promise
														});
												} else if (event_using_room) { // if room is used by this event
													resolve(); // resolve the update promise
												} else { // not available at the chosen date
													roomNotUpdated.push(room._id); // push the room id into the array of not updated rooms
													roomNotUpdatedNames.push(room.roomName); // push the room name into the array of not updated rooms

													resolve(); // resolve the update promise
												}
											});
										} else resolve(); // resolve the update promise
									} else { // no rooms found
										roomNotUpdated.push(room._id); // push the room id into the array of not updated rooms
										resolve(); // resolve the update promise
									}
								});
							}));

							numberOfSpaces = numberOfSpaces + room.capacity; // increment number of spaces
						});
					}

					posted_visitors.forEach(function (visitor) { // iterate through the posted visitors array
						visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : ""; // increment the number of visitors
					});

					if (numberOfSpaces < numberOfVisitors) error_msg = 'Not enough spaces are assigned for the event'; // if number of spaces are less than the number of visitors

					/* Check for re-posted staff members */
					staff_use.forEach(function (prev_staff_member) {
						let staff_posted = false; // to check if the staff member has been used already

						posted_staff_use.forEach(function (posted_staff_member) { // iterate through all the staff members who are posted
							if (posted_staff_member.staffMemberID.toString() === prev_staff_member._id.toString()) staff_posted = true; // staff member already used if ids match
						});

						if (!staff_posted) { // if staff member is not posted
							removeStaffEvent(prev_staff_member._id,event._id); // remove event from attending events of the staff member

							/* Send notification that the staff member is removed */
							Staff.findOne({_id: prev_staff_member._id}, function (errFind, staffMemberDoc) { // fetch staff member from database
								if (!errFind) {
									if (staffMemberDoc) { // staff member found
										// notify staff member
										genFunctions.sendNotification(staffMemberDoc._id, "Event Update", "You have been removed from an event.");
										genFunctions.sendEmail(staffMemberDoc.email, null, null, null, null, "removed").then().catch();
									} else { // staff member not found
										console.log("Staff member not found.");
									}
								} else { // error while fetching staff member from database
									console.log(errFind);
								}
							});
							/* End Send notification that the staff member is removed */
						}
					});
					/* End Check for re-posted staff members */

					/* Send notifications to staff members */
					posted_staff_use.forEach(function (posted_staff_member) {
						let new_staff = true; // to check if the staff member has been used already

						staff_use.forEach(function (prev_staff_member) { // iterate through already used staff members
							if (posted_staff_member.staffMemberID.toString() === prev_staff_member._id.toString()) new_staff = false; // staff member is not new if ids match
						});

						if (new_staff) { // if staff member is new to this event
							Staff.findOne({_id: posted_staff_member.staffMemberID}, function (errorFindStaffEmail, staffDoc) { // fetch staff member from database
								if (!errorFindStaffEmail) {
									// send notifications to user
									genFunctions.sendNotification(staffDoc._id, "Event Participation", "You have been added to participate to an event.");
									genFunctions.sendEmail(staffDoc.email, null, null, null, null, "added").then().catch();
								} else { // error has occurred while fetching staff member from database
									console.log(errorFindStaffEmail);
								}
							});
						}
					});
					/* End Send notifications to staff members */

					/* Check if re-posted visitors */
					visitor_attending.forEach(function (prev_visitor) {
						let visitor_posted = false;

						posted_visitors.forEach(function (posted_visitor) { // iterate through all posted visitors
							if (posted_visitor.visitorID.toString() === prev_visitor._id.toString()) visitor_posted = true; // visitor is already used if ids match
						});

						if (!visitor_posted) { // if visitor not re-posted
							removeVisitorEvent(prev_visitor._id,event._id); // remove event from attending events of the visitor
						}
					});
					/* End Check if re-posted visitors */

					/* Send notifications to visitors */
					posted_visitors.forEach(function (posted_visitor) {
						let new_visitor = true;

						visitor_attending.forEach(function (prev_visitor) { // iterate through already posted visitors
							if (posted_visitor.visitorID.toString() === prev_visitor._id.toString()) new_visitor = false; // visitor is not new if ids match
						});

						if (new_visitor) { // if visitor is new to this event
							Visitor.findOne({_id: posted_visitor.visitorID}, function (errorFindVisitorEmail, visitorDoc) { // fetch visitor from database
								if (!errorFindVisitorEmail) {
									// send notifications to user
									genFunctions.sendNotification(visitorDoc._id, "Event Participation", "You have been added to participate to an event.");
									genFunctions.sendEmail(visitorDoc.contactEmail, null, null, null, null, "added").then().catch();
								} else { // error has occurred while fetching visitor from database
									console.log(errorFindVisitorEmail);
								}
							});
						}
					});
					/* End Send notifications to visitors */

					/* Check for re-posted equipment */
					equipment_use.forEach(function (prev_equip) {
						let equipment_posted = false; // to check if the equipment is already used
						let equip_qty = 0; // to store the equipment quantity

						posted_equipment.forEach(function (posted_equip) { // iterate through posted equipment
							// set the equipment available quantity if ids match
							if (posted_equip.equipID.toString() === prev_equip._id.toString()) {
								equipment_posted = true;
								repostedEquip.push(posted_equip.equipID);
								equip_qty = prev_equip.reqQty - posted_equip.reqQty;
								posted_equip['quantity'] = prev_equip.quantity + posted_equip.reqQty + equip_qty;
							}
						});

						if (!equipment_posted) { // if the equipment is re-posted
							if (prev_equip.reqQty > 0) { // if the used equipment has any quantity required
								promisesUpdate.push(new Promise(function (resolve) { // add the promise to the promises array
									Equipment.findOne({_id: prev_equip._id}, function (errFindEquip, equipFindDoc) { // fetch equipment information from the database
										if (errFindEquip) { // error while fetching the equipment information
											console.log(errFindEquip);
											equipmentNotUpdated.push(prev_equip._id); // push equipment id to the array of not updated equipment ids

											resolve(); // resolve the update promise
										} else if (equipFindDoc) { // equipment found
											previousQuantity.push({ // add the previous info of the equipment to the previous quantity array
												equipID: prev_equip._id,
												quantity: equipFindDoc.quantity
											});

											// update the equipment quantity
											Equipment.updateOne({_id: prev_equip._id}, {$set: {quantity: prev_equip.quantity + prev_equip.reqQty}}, function (errorUpdateEquip) {
												if (errorUpdateEquip) {
													equipmentNotUpdated.push(prev_equip._id); // push equipment id to the array of not updated equipment ids
													equipmentNotUpdatedNames.push(equipFindDoc.typeName); // push equipment name to the array of not updated equipment names

													console.log(errorUpdateEquip);
												}

												resolve(); // resolve the update promise
											});
										} else {
											equipmentNotUpdated.push(prev_equip._id); // push equipment id to the array of not updated equipment ids
											resolve(); // resolve the update promise
										}
									});
								}));
							}
						} else if (equip_qty !== 0) { // check if equipment quantity changed
							promisesUpdate.push(new Promise(function (resolve) { // add the promise to the promises array
								Equipment.findOne({_id: prev_equip._id}, function (errFindEquip, equipFindDoc) { // fetch the equipment from the database
									if (!errFindEquip) {
										if (equipFindDoc && equipFindDoc.quantity - equip_qty >= 0) { // check if the equipment has the required quantity available
											previousQuantity.push({ // push the information about the recovery into the previous quantity array
												equipID: prev_equip._id,
												quantity: equipFindDoc.quantity
											});

											// update quantity of the equipment
											Equipment.updateOne({_id: prev_equip._id}, {$set: {quantity: equipFindDoc.quantity + equip_qty}}, function (errorUpdateEquip) {
												if (errorUpdateEquip) {
													equipmentNotUpdated.push(prev_equip._id); // push equipment id to the array of not updated equipment ids
													equipmentNotUpdatedNames.push(equipFindDoc.typeName); // push equipment name to the array of not updated equipment names

													console.log(errorUpdateEquip);
												}

												resolve(); // resolve the update promise
											});
										} else { // either equipment not found or there is not enough available quantity
											console.log('Cannot update equipment, because insufficient quantity.');

											equipmentNotUpdated.push(prev_equip.equipID); // push equipment id to the array of not updated equipment ids
											equipmentNotUpdatedNames.push(equipFindDoc.typeName); // push equipment name to the array of not updated equipment names

											resolve(); // resolve the update promise
										}
									} else {
										console.log(errFindEquip);

										equipmentNotUpdated.push(prev_equip.equipID); // push equipment id to the array of not updated equipment ids
										equipmentNotUpdatedNames.push(equipFindDoc.typeName); // push equipment name to the array of not updated equipment names

										resolve(); // resolve the update promise
									}
								});
							}));
						}
					});
					/* End Check for re-posted equipment */

					/* Iterate through posted equipment */
					posted_equipment.forEach(function (posted_equip) {
						if (!repostedEquip.includes(posted_equip.equipID)) { // check if equipment is re-posted
							promisesUpdate.push(new Promise(function (resolve) { // add the promise to the promises array
								Equipment.findOne({_id: posted_equip.equipID}, function (errFindEquip, equipFindDoc) { // fetch equipment information from database
									if (!errFindEquip) {
										if (equipFindDoc) { // check if equipment found
											posted_equip['quantity'] = equipFindDoc.quantity;

											if (equipFindDoc.quantity - posted_equip.reqQty >= 0) {
												// update quantity of equipment
												Equipment.updateOne({_id: posted_equip.equipID}, {$inc: {quantity: -posted_equip.reqQty}}, function (errorUpdateEquip) {
													if (errorUpdateEquip) {
														console.log(errorUpdateEquip);

														equipmentNotUpdated.push(posted_equip.equipID); // push equipment id to the array of not updated equipment ids
														equipmentNotUpdatedNames.push(equipFindDoc.typeName); // push equipment name to the array of not updated equipment names
													}

													resolve(); // resolve the update promise
												});
											} else {
												console.log('Cannot update equipment, because insufficient quantity.');

												equipmentNotUpdated.push(posted_equip.equipID); // push equipment id to the array of not updated equipment ids
												equipmentNotUpdatedNames.push(equipFindDoc.typeName); // push equipment name to the array of not updated equipment names

												resolve(); // resolve the update promise
											}
										} else {
											console.log('Cannot update equipment, because insufficient quantity.');

											resolve(); // resolve the update promise
										}
									} else { // error while fetching information about equipment from database
										console.log(errFindEquip);

										resolve(); // resolve the update promise
									}
								});
							}));
						}
					});
					/* End Iterate through posted equipment */

					// when all promises for updates are finished
					Promise.all(promisesUpdate).then(function () {
						let event_object = { // event object to store the information as it is into the database (needed later for rendering)
							_id: event._id,
							eventName: req.body.eventName,
							eventDescription: req.body.description,
							date: moment(req.body.date).format('YYYY-MM-DDTHH:mm'),
							endDate: req.body.endDate ? moment(req.body.endDate).format('YYYY-MM-DDTHH:mm') : "",
							eventType: event_type._id,
							location: req.body.location
						};

						if (!(equipmentNotUpdated.length > 0) && !(roomNotUpdated.length > 0)) { // check if the rooms and equipment are updated
							let event_object_update = { // update to be executed object
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

							Event.updateOne({_id: req.body.id}, event_object_update, function (errEventUpdate) { // update the event
								if (!errEventUpdate) {
									/* Notifications and emails */
									posted_staff_use.forEach(function (staffMember) { // iterate through posted staff
										Staff.findOne({_id: staffMember.staffMemberID}, function (errorStaffSendEmail, staffMemberDoc) { // fetch staff from database
											if (!errorStaffSendEmail) {
												let attending = false; // to check if the user is attending

												staffMemberDoc.attendingEvents.forEach(function (attending_event) { // iterate through the events that the staff member is attending
													if (attending_event.eventID.toString() === req.body.id.toString()) attending = true; // if ids match then the staff member is attending
												});

												if (!attending) { // if not attending
													Staff.updateOne({_id: staffMemberDoc._id}, { // add event to attending of the staff member
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
												// send notifications to staff member
												genFunctions.sendNotification(staffMemberDoc._id, "Event Update", "An event that you are participating has been updated.");
												genFunctions.sendEmail(staffMemberDoc.email, null, null, null, null, "edited").then().catch();
											}
										});
									});

									posted_visitors.forEach(function (visitor) { // iterate through posted visitors
										Visitor.findOne({_id: visitor.visitorID}, function (errorVisitorSendEmail, visitorDoc) { // fetch visitor from database
											if (!errorVisitorSendEmail) {
												let attending = false; // to check if the user is attending

												visitorDoc.attendingEvents.forEach(function (attending_event) { // iterate through the events that the visitor is attending
													if (attending_event.eventID === req.body.id) attending = true; // if ids match then the visitor is attending
												});

												if (!attending) { // if not attending
													Visitor.updateOne({_id: visitorDoc._id}, { // add the event to attending of the visitor
														$push: {
															attendingEvents: {
																eventID: req.body.id,
																eventName:event_object.eventName}}}, function (errUpdateVisitor) {
														if (errUpdateVisitor) console.log(errUpdateVisitor);
													});
												}
												// send notifications to visitor
												genFunctions.sendNotification(visitorDoc._id, "Event Update", "An event that you are participating has been updated.");
												genFunctions.sendEmail(visitorDoc.contactEmail, null, null, null, null, "edited").then().catch();
											}
										});
									});
									/* End Notifications and emails */

									message = "Successfully updated event: " + event.eventName;
								} else { // error while fetching event from database
									console.log(errEventUpdate);
									error_msg = "Unknown error occurred, please try again.";

									recoverQuantity(previousQuantity); // recover quantity of the equipment
									recoverRoomsAvailability(roomNotUpdated,req.body.id); // delete the events from the room schedule
								}

								// render add-edit
								renderEdit(res, req, event_object, posted_equipment, posted_rooms, posted_staff_use, posted_visitors, eventTypes, staff, equipment, rooms, visitors);
							});
						} else {
							recoverQuantity(previousQuantity); // recover quantity of the equipment
							recoverRoomsAvailability(roomNotUpdated,req.body.id); // delete the events from the room schedule

							if (equipmentNotUpdatedNames.length > 0) { // check if there are is any equipment that is not updated
								/* Generate error message including all the names of the equipment that was not updated */
								error_msg = 'Unable to edit event because the equipment with names: ';

								equipmentNotUpdatedNames.forEach(function (equipName) {
									error_msg = error_msg.concat('"' + equipName + '",');
								});

								error_msg = error_msg.concat(' have insufficient quantity, please revise all the data again and try to edit event again.');
								/* End Generate error message including all the names of the equipment that was not updated */
							}

							// render add-edit
							renderEdit(res, req, event_object, posted_equipment, posted_rooms, posted_staff_use, posted_visitors, eventTypes, staff, equipment, rooms, visitors);
						}
					});
				});
			} else { // error occurred or event not found
				console.log(errFindEvent);
				/* Render Template */
				res.render('view', {
					error: "Event not found!",
					listLink: listLink,
					user: req.user
				});
				/* End Render Template */

				resetErrorMessage(); // reset global variables
			}
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset global variables
	}
});

/**
 * The Archive Delete route is used to delete the archive event from the database
 * renders the view template
 */
router.get('/archive/' + deleteLink, function (req, res) {
	if (req.user && req.user.permission >= 30) { // check if user has permissions
		genFunctions.deleteEvent(req.query.id, "archive",true).then(function (result) {
			/* Render Template */
			res.render('view', {
				deleteMsg: result,
				listLink: listLink,
				user: req.user
			});
			/* End Render Template */

			resetErrorMessage(); // reset global variables
		}).catch(function (error) {
			/* Render Template */
			res.render('view', {
				error: error,
				listLink: listLink,
				user: req.user
			});
			/* End Render Template */

			resetErrorMessage(); // reset global variables
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset global variables
	}
});

/**
 * The Delete route is used to archive the event information delete the event from the database
 * renders the view template
 */
router.get('/' + deleteLink, function (req, res) {
	if (req.user && req.user.permission >= 30) { // check if user has permissions
		genFunctions.deleteEvent(req.query.id, "event-list",true).then(function (result) {
			/* Render Template */
			res.render('view', {
				deleteMsg: result,
				listLink: listLink,
				user: req.user
			});
			/* End Render Template */

			resetErrorMessage(); // reset global variables
		}).catch(function (error) {
			/* Render Template */
			res.render('view', {
				error: error,
				listLink: listLink,
				user: req.user
			});
			/* End Render Template */

			resetErrorMessage(); // reset global variables
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset global variables
	}
});

/**
 * The Add route with a get method used to display the fields that have to be populated
 * in order to insert event to the database
 */
router.get('/' + addLink, async function (req, res) {
	if (req.user && req.user.permission >= 20) { // check if user has permissions
		// render add-edit
		renderAdd(res,req,null,null,null,null).then().catch();
	} else {
		res.redirect('/');

		resetErrorMessage(); // reset global variables
	}
});

/**
 * The Add route with a post method used to insert the populated fields into the database
 * and populate the fields again into the template just in case any error happens
 * and render the add-edit template again
 */
router.post('/' + addLink, async function (req, res) {
	if (req.user && req.user.permission >= 20) { // check if user has permissions
		let equipment_use = getPostedEquipment(req); // store the posted equipment here
		let rooms_use = getPostedRooms(req); // rooms that were selected
		let staff_use = getPostedStaff(req); // staff members that were selected
		let visitor_attending = getPostedVisitors(req); // visitors that were selected
		let numberOfSpaces = 0; // count the number of spaces
		let numberOfVisitors = 0; // count the number of visitors
		let promises = []; // promises that need to be executed before insert
		let equipmentNotUpdated = []; // array of the equipment ids that are not updated
		let equipmentNotUpdatedNames = []; // array of the equipment names that are not updated
		let roomNotUpdated = []; // array of the room ids that are not updated
		let roomNotUpdatedNames = []; // array of the room names that are not updated

		/* Update equipment quantity */
		equipment_use.forEach(function(equip){
			promises.push(new Promise(function (resolve) { // add to promises array
				Equipment.findOne({_id: equip.equipID}, function (errFindEquip, equipmentFoundDoc) { // fetch the equipment information from the database
					if (!errFindEquip) {
						if (equipmentFoundDoc && equipmentFoundDoc.quantity >= equip.reqQty) { // check if there is enough valid equipment
							let new_quantity = equipmentFoundDoc.quantity-equip.reqQty; // the new quantity that is going to be available
							Equipment.updateOne({_id: equip.equipID}, {$set: {quantity: new_quantity}}, function (err) { // update the equipment quantity
								if (err) { // error while updating equipment
									console.log("Failed to update quantity for id:" + equip.equipID);
									console.log(err);
								}
								resolve(); // resolve the update promise
							});
						} else { // error has occurred while fetching equipment information from database
							equipmentNotUpdated.push(equip.equipID); // push equipment id to the array of not updated equipment ids
							if (equipmentFoundDoc) equipmentNotUpdatedNames.push(equipmentFoundDoc.typeName); // push equipment name to the array of not updated equipment names

							resolve(); // resolve the update promise
						}
					} else {
						console.log(errFindEquip);
						resolve(); // resolve the update promise
					}
				});
			}));
		});
		/* End Update equipment quantity */

		/* Validate rooms */
		rooms_use.forEach(function (room) { // iterate through all the posted rooms
			promises.push(new Promise(function (resolve) { // add to promises array
				Room.findOne({_id:room._id},function(errFindRoom,roomDoc){ // fetch room information from database
					if(errFindRoom){ // error while fetching room information from database
						console.log(errFindRoom);
						roomNotUpdated.push(room._id); // push the room id into the array of not updated room ids
					} else {
						if(roomDoc) {
							if (roomDoc.events) { // check if room has any events assigned
								roomDoc.events.forEach(function (roomEvent) { // iterate through the events that the room is assigned to
									/* Get time to midnight after the event end */
									let startDate = Date.parse(roomEvent.date); // room event start date
									let endDate = roomEvent.endDate ? Date.parse(roomEvent.endDate) : false; // the room event end date
									let eventStartDate = Date.parse(req.body.date); // event (added) start date
									let eventEndDate = req.body.endDate ? Date.parse(req.body.endDate) : false; // event (added) end date
									let now = new Date(); // current time
									let year = now.getUTCFullYear(); // current year
									let month = now.getUTCMonth(); // current month
									let day = now.getUTCDate(); // current day

									let startDayHour = Date.UTC(year, month, day, 0, 0, 0, 0); // midnight for current date
									let midnight = startDayHour + 86400000; // midnight on the next day

									let time_left = midnight - now.getTime(); // time left to midnight
									/* End Get time to midnight after the event end */

									// check if the event does not overlap with other events using the room at the same time
									if (((endDate && endDate < eventStartDate) ||
										(startDate && !endDate && ((!eventEndDate && startDate >= eventStartDate + time_left) ||
											(startDate + time_left <= eventStartDate) ||
											(eventEndDate && eventEndDate + time_left <= startDate)
										)))) {

										numberOfSpaces = numberOfSpaces + roomDoc.capacity; // increment the number of spaces
									} else {
										roomNotUpdated.push(roomDoc._id); // push the room id into the array of not updated room ids
										roomNotUpdatedNames.push(roomDoc.roomName); // push the room name into the array of not updated room names
									}
								});
							} else numberOfSpaces = numberOfSpaces + roomDoc.capacity; // increment the number of spaces
						}
					}

					resolve();
				});
			}));
		});
		/* End Validate rooms */

		visitor_attending.forEach(function (visitor) { // iterate through all the selected visitors
			visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : ""; // increment the number of visitors
		});

		if (numberOfSpaces < numberOfVisitors) error_msg = 'Not enough spaces are assigned for the event'; // if number of spaces are less than the number of visitors

		// when all updates are resolved
		Promise.all(promises).then(function () {
			if (!(equipmentNotUpdated.length > 0) && !(roomNotUpdated.length > 0)) { // check if there is equipment that is not updated
				let new_event = new Event({ // object to be inserted into the database
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

				/* Insert new event */
				new_event.save(function (error, eventDoc) { // insert object to database
					if (!error) {
						/* Update rooms */
						rooms_use.forEach(function(room){ // iterate through all the rooms chosen
							Room.updateOne({_id: room._id}, // update room
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
									if (errUpdateRoom) console.log(errUpdateRoom); // error while updating room
								});
						});
						/* End Update rooms */

						staff_use.forEach(function (staff_member) { // iterate through all the staff members chosen
							Staff.findOne({_id: staff_member.staffMemberID}, function (err, staffDoc) { // fetch staff member information from database
								if (!err && staffDoc) {
									Staff.updateOne({_id: staff_member.staffMemberID}, { // update staff member attending events
										$push: {
											attendingEvents: {
												eventID: eventDoc._id,
												role: staff_member.role
											}
										}
									}, function (errUpdate) {
										if (errUpdate) { // error while updating staff member
											console.log(errUpdate);
										} else {
											// send notifications that the staff member is added to this event
											genFunctions.sendNotification(staffDoc._id, "Participating Event", "You are a participant to a new event.");
											genFunctions.sendEmail(staffDoc.email, null, null, null, null, "added").then().catch();
										}
									});
								} else { // staff member not found or error with database
									console.log(err);
								}
							});
						});

						visitor_attending.forEach(function (visitor_att) {
							Visitor.findOne({_id: visitor_att.visitorID}, function (err, visitorDoc) {
								if (!err && visitorDoc) {
									Visitor.updateOne({_id: visitor_att.visitorID}, {$push: {attendingEvents: {eventID: eventDoc._id,eventName:eventDoc.eventName}}}, function (errUpdate) {
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

						message = "Successfully created new event: " + req.body.eventName; // success message

						renderAdd(res,req,staff_use,equipment_use,rooms_use,visitor_attending).then().catch(); // render add-edit
					} else {
						error_msg = validationErr(error); // validation error

						renderAdd(res,req,staff_use,equipment_use,rooms_use,visitor_attending).then().catch(); // render add-edit
					}
				});
				/* End Insert new event */
			} else { // rooms or equipment were not able to update
				/* Recover equipment quantity and generate error message */
				if(equipmentNotUpdated.length > 0) {
					recoverQuantity(equipment_use);

					if (equipmentNotUpdatedNames.length > 0) {
						error_msg = 'Unable to add event because the equipment with names: ';

						equipmentNotUpdatedNames.forEach(function (equipName) { // iterate through all the equipment that was not updated and have names
							error_msg = error_msg.concat('"' + equipName + '",');
						});

						error_msg = error_msg.concat(' have insufficient quantity, please revise all the data again and try to add event again.');
					}
				}
				/* End Recover equipment quantity and generate error message */

				/* Recover room availability and generate error message */
				if(roomNotUpdated.length > 0){
					error_msg = 'Unable to add event because rooms with names: ';

					roomNotUpdatedNames.forEach(function (roomName) { // iterate through all the rooms that was not updated and have names
						error_msg = error_msg.concat('"' + roomName + '",');
					});

					error_msg = error_msg.concat(' are not available, please revise all the data again and try to add event again.');
				}
				/* End Recover room availability and generate error message */

				renderAdd(res,req,staff_use,equipment_use,rooms_use,visitor_attending).then().catch(); // render add-edit
			}
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset global variables
	}
});

/**
 * The Sign Up route is used by staff members to sign up for an event
 * if they have not already signed up
 */
router.get('/' + signUpLink, async function (req, res) {
	if (req.user && req.user.permission >= 10) { // check if user has permissions
		/**
		 * Function to render error when the event is not found or error
		 * happens while fetching data or updating
		 */
		function errorRender(){
			/* Render Template */
			res.render('view', {
				error: "Unknown error occurred while trying to sign you up for event. Please try again.",
				listLink: listLink,
				user: req.user
			});
			/* End Render Template */

			resetErrorMessage(); // reset global variables
		}

		Event.findOne({_id:req.query.id},function(errFindEvent,eventDoc){ // fetch the event information from the database
			if(errFindEvent){ // error occurred while fetching event information from database
				console.log(errFindEvent);

				errorRender(); // render error
			} else if(eventDoc){ // event found in database
				Staff.findOne({_id:req.user._id},function(errFindStaff,staffDoc){ // fetch staff member information from the database
					if(errFindStaff){ // error occurred while fetching staff member information from database
						console.log(errFindStaff);

						errorRender(); // render error
					} else if(staffDoc) { // staff member found
						Staff.updateOne({_id: req.user._id}, { // update staff member attending events
							$push: {
								attendingEvents: {
									eventID: eventDoc._id,
									role: staffDoc.role
								}
							}
						}, function (errUpdate, staffDoc) {
							if (errUpdate) { // error while updating staff member
								console.log(errUpdate);
							} else {
								// send notifications to the user
								genFunctions.sendNotification(staffDoc._id, "Participating Event", "You are a participant to a new event.");
								genFunctions.sendEmail(staffDoc.email, null, null, null, null, "added").then().catch();
							}
						});

						Event.updateOne({_id: req.query.id}, { // update event chosen staff members
							$push: {
								staffChosen: {
									staffMemberID: req.user._id,
									role: staffDoc.role
								}
							}
						}, function (errUpdate) {
							if (errUpdate) { // error while updating the event
								console.log(errUpdate);

								errorRender(); // render error
							} else {
								/* Render Template */
								res.render('view', {
									signUpMsg: "Successfully signed up for event:" + eventDoc.eventName + ".",
									listLink: listLink,
									user: req.user
								});
								/* End Render Template */

								resetErrorMessage(); // reset global variables
							}
						});
					} else { // staff member not found in database
						res.redirect('/');

						resetErrorMessage(); // reset global variables
					}
				});
			} else { // Event information not found in database
				/* Render Template */
				res.render('view', {
					error: "Event not found.",
					listLink: listLink,
					user: req.user
				});
				/* End Render Template */

				resetErrorMessage(); // reset global variables
			}
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset global variables
	}
});

module.exports = router; // export the route
