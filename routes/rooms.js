/**
 * Author: Lyuboslav Velikov
 * ID: 201186573
 * University of Liverpool
 * This file is used to handle all the routes that are
 * used to manipulate or insert data for the rooms
 * @type {createApplication} is the main route handler (router)
 */

const express = require('express');
const router = express.Router(); // used for the route requests and results

/* Model */
const Room = require('../models/Room');
/* End Model */

/* Links of the routes for manipulating the rooms */
const editLink = "edit-room";
const viewLink = "view-room";
const addLink = "add-room";
const deleteLink = "delete-room";
const listLink = "list-rooms";
const exportLink = "../export?type=Rooms";
/* End Links of the routes for manipulating the rooms */

/* Feedback Messages */
let error_msg = null;
let message = null;
/* End Feedback Messages */

/* Functions */
/**
 * Function for structuring the data returned by MongoDB validation
 * @param error Passing the error so it can be checked what is it actually
 * @returns {string} The error that has to be printed
 */
function validationErr(error){
	let local_error_msg = "";

	if(error.name === "ValidationError"){ // check if the error is from the validator
		if (typeof error.errors.roomName !== "undefined" &&
			error.errors.roomName !== null) {
			local_error_msg = error.errors.roomName.message
		}
		if (typeof error.errors.capacity !== "undefined" &&
			error.errors.capacity !== null) {
			local_error_msg = error.errors.capacity.message
		}
		console.log(local_error_msg);
	} else {
		local_error_msg = "Unknown error has occurred during adding room. Please try again later.";
		console.log(error);
	}

	return local_error_msg;
}

/**
 * Reset the feedback messages
 */
function resetErrorMessage(){
	error_msg = null;
	message = null;
}

/**
 * Render the add-edit template with the details for editing
 * @param res The result that has to be shown to the user (the template in our case)
 * @param req The request that has been made by the user
 * @param room The event type information gathered from the database
 */
function renderEdit(res,req,room){
	// fields that have to be entered
	let fields = [{name: "ID", type: "text", identifier: "id", readonly: true},
		{name: "Name", type: "text", identifier: "roomName"},
		{name: "Capacity", type: "number", identifier: "capacity"}];

	/* Render Template */
	res.render('edit', {
		title: 'Editing room: ' + room.roomName,
		fields: fields,
		error: error_msg,
		message: message,
		item: {
			id: room.id,
			roomName: room.roomName,
			capacity: room.capacity
		},
		customFieldsValues: room.customFields,
		customFields: true,
		submitButtonText:"Save",
		actionLink: '/rooms/' + editLink,
		cancelLink: viewLink + '?id=' + room._id,
		user:req.user
	});
	/* End Render Template */

	resetErrorMessage(); // reset messages
}

/**
 * Render the add-edit template with the details for adding
 * @param res The result that has to be shown to the user (the template in our case)
 * @param req The request that has been made by the user
 * @param room The room information posted
 */
function renderAdd(res,req,room){
	// fields that have to be entered
	let fields = [{name: "Name", type: "text", identifier: "roomName"},
		{name: "Capacity", type: "number", identifier: "capacity"}];

	/* Render Template */
	res.render('add', {
		title: 'Add New Room',
		fields: fields,
		error: error_msg,
		message: message,
		item: {
			roomName: req.body.Name,
			Capacity: req.body.Capacity,
		},
		customFields: true,
		customFieldsValues: room.customFields,
		submitButtonText:"Add",
		actionLink: '/rooms/' + addLink,
		cancelLink: listLink,
		user:req.user
	});
	/* End Render Template */

	resetErrorMessage(); // reset messages
}

/**
 * Function to get the custom fields into objects as they have to be added to the database
 * @param req The request that has been made by the user
 * @returns {Array} The resulting set of custom fields
 */
function getCustomFields(req){
	let custom_fields = []; // store the custom fields in this array

	for (const [field_post_key, field_post_value] of Object.entries(req.body)) { // iterate through the request fields that have been entered
		if (req.body.hasOwnProperty(field_post_key)) { // if has the key iterated to
			if (field_post_key !== "name" && field_post_key !== "quantity") {  // if different from the name and quantity property because they are static
				if (field_post_key.includes('fieldName')) { // check if the key includes the "fieldName" string in it
					custom_fields.push({ // add the custom field object to the array
						fieldName: field_post_value,
						fieldValue: ""
					});
				} else if (field_post_key.includes('fieldValue')) { // if the key includes the "fieldValue" string in it
					custom_fields[custom_fields.length - 1]['fieldValue'] = field_post_value; // then the value should be added to the field object
				}
			}
		}
	}

	return custom_fields; // return the array of custom fields
}
/* End Functions */

/**
 * The List route used to list the rooms in the list template
 */
router.get('/'+listLink, function(req, res) {
	if(req.user && req.user.permission >= 20) { // check if the user is either Outreach coordinator or Staff Assistant
		let columns = ["ID", "Name", "Capacity", "Options"]; // columns used as a header

		Room.find({}, function (err, rooms) { // find all event types in the database
			let roomList = []; // store the list of rooms in here

			/* Structure only the needed information */
			rooms.forEach(function (room) {
				roomList.push({
					id: room._id,
					name: room.roomName,
					capacity: room.capacity,
				});
			});
			/* End Structure only the needed information */

			error_msg = rooms.length === 0 ? "No results to show" : ""; // error message to show if there are no rooms found

			/* Render Template */
			res.render('list', {
				title: 'Rooms List',
				list: roomList,
				filter: "Rooms",
				columns: columns,
				editLink: editLink,
				viewLink: viewLink,
				addLink: addLink,
				deleteLink: req.user.permission >= 30 ? deleteLink : null,
				exportLink: exportLink,
				error: error_msg,
				user:req.user
			});
			/* End Render Template */

			resetErrorMessage(); // reset messages
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

/**
 * The View route used to view the information of a specific room in the view template
 */
router.get('/'+viewLink, function(req, res) {
	if(req.user && req.user.permission >= 20) { // check if the user is either Outreach coordinator or Staff Assistant
		Room.findOne({_id: req.query.id}, function (err, room) { // fetch room data from the database
			if (!err && room) { // no errors and room is found in the database
				/* Render Template */
				res.render('view', {
					title: 'Viewing room: ' + room.roomName,
					error: null,
					item: {
						ID: room._id,
						Name: room.roomName,
						Capacity: room.capacity,
						customFields: room.customFields
					},
					listLink: listLink,
					deleteLink: req.user.permission >= 30 ? deleteLink + '?id=' + room._id : null,
					editLink: editLink + '?id=' + room._id,
					user:req.user
				});
				/* End Render Template */
			} else {
				/* Render Template */
				res.render('view', {
					error: "Room not found!",
					listLink: listLink,
					user:req.user
				});
				/* End Render Template */
			}

			resetErrorMessage(); // reset messages
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

/**
 * The Edit route with a get method used to display the information
 * into the fields that have to be entered in order to edit a room
 * in the add-edit template
 */
router.get('/'+editLink, function(req, res) {
	if(req.user && req.user.permission >= 20) { // check if the user is either Outreach coordinator or Staff Assistant
		Room.findOne({_id: req.query.id}, function (err, room) { // fetch room data from the database
			if (!err && room) { // no errors and room is found in the database
				room['id'] = room._id;
				renderEdit(res,req,room); // render add-edit
			} else {
				/* Render Template */
				res.render('edit', {
					error: "Room not found!",
					listLink: listLink,
					user:req.user
				});
				/* End Render Template */

				resetErrorMessage(); // reset messages
			}
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

/**
 * The Edit route with a post method used to update the information
 * from the database and populate the fields if another edit will be required
 * in the add-edit template
 */
router.post('/'+editLink, function(req, res) {
	if(req.user && req.user.permission >= 20) { // check if the user is either Outreach coordinator or Staff Assistant
		let room = { // structure the posted data into an object
			id:req.body.id,
			roomName:req.body.roomName,
			capacity:req.body.capacity,
			customFields:getCustomFields(req)
		};

		// the updates that have to be saved
		let updates = {$set: {roomName: req.body.roomName, capacity: req.body.capacity, customFields: room.customFields}};

		Room.updateOne({_id: req.body.id}, updates, {runValidators: true}, function (err) { // update the room
			if (!err) {
				message = "Successfully updated room: " + req.body.roomName; // message for success

				renderEdit(res,req,room); // render add-edit
			} else { // error while updating room
				error_msg = validationErr(err); // error message from validation

				renderEdit(res,req,room); // render add-edit
			}
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

/**
 * The Add route with a get method used to display the fields that have to be populated
 * in order to insert room to the database
 */
router.get('/'+addLink, function(req, res, ) {
	if(req.user && req.user.permission >= 20) { // check if the user is either Outreach coordinator or Staff Assistant
		renderAdd(res,req,null); // render add-edit
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

router.post('/'+addLink, function(req, res) {
	if(req.user && req.user.permission >= 20) { // check if the user is either Outreach coordinator or Staff Assistant
		let room_object = {}; // the temporary room object

		/* Assign the room fields from the posted fields */
		room_object['roomName'] = req.body.roomName;
		room_object['capacity'] = req.body.capacity;
		room_object['customFields'] = getCustomFields(req);
		/* End Assign the room fields from the posted fields */

		let new_room = new Room(room_object); // create new room object to store in the database

		/* Insert new room */
		new_room.save(function (error) { // insert into the database
			if (!error) {
				message = "Successfully added new room: " + req.body.roomName; // success message
				console.log(message);
			} else { // error while inserting data
				error_msg = validationErr(error); // validation error
			}

			renderAdd(res,req,room); // render add-edit
		});
		/* End Insert new room */
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

/**
 * The Delete route is used to delete an entity from the database
 * renders the view template
 */
router.get('/'+deleteLink, function(req, res) {
	if(req.user && req.user.permission >= 30) { // check if the user is Outreach coordinator
		Room.deleteOne({_id: req.query.id}, function (err) { // delete room from the database
			if (!err) {
				/* Render Template */
				res.render('view', {
					deleteMsg: "Successfully deleted room!",
					listLink: listLink,
					user:req.user
				});
				/* End Render Template */
			} else { // error while deleting room
				console.log(err); // console log the error
				/* Render Template */
				res.render('view', {
					error: "Room not found!",
					listLink: listLink,
					user:req.user
				});
				/* End Render Template */
			}

			resetErrorMessage(); // reset messages
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

module.exports = router; // export the route
