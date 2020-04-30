/**
 * Author: Lyuboslav Velikov
 * ID: 201186573
 * University of Liverpool
 * This file is used to handle all the routes that are
 * used to manipulate or insert data for the event types
 * @type {createApplication} is the main route handler (router)
 */

const express = require('express');
const router = express.Router(); // used for the route requests and results

/* Model */
const EventType = require('../models/EventType');
/* End Model */

/* Links of the routes for manipulating the event types */
const editLink = "edit-event-type";
const viewLink = "view-event-type";
const addLink = "add-event-type";
const deleteLink = "delete-event-type";
const listLink = "list-event-type";
const exportLink = "../export?type=Event Types";
/* End Links of the routes for manipulating the event types */

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
		if (typeof error.errors.eventTypeName !== "undefined" &&
			error.errors.eventTypeName !== null) {
			local_error_msg = error.errors.eventTypeName.message
		}
		console.log(local_error_msg);
	} else {
		local_error_msg = "Unknown error has occurred during adding event type. Please try again later.";
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
 * @param eventType The event type information gathered from the database
 */
function renderEdit(res,req,eventType){
	// fields that have to be entered
	let fields = [{name: "ID", type: "text", identifier: "id", readonly: true},
		{name: "Name", type: "text", identifier: "eventTypeName"}];

	/* Render Template */
	res.render('add-edit', {
		title: 'Editing event type: ' + eventType.eventTypeName,
		fields: fields,
		error: error_msg,
		message: message,
		item: {
			ID: eventType._id,
			Name: eventType.eventTypeName,
		},
		customFieldsValues: eventType.customFields,
		customFields: true,
		submitButtonText:"Save",
		actionLink: '/event-types/' + editLink,
		cancelLink: viewLink + '?id=' + eventType._id,
		user:req.user
	});
	/* End Render Template */

	resetErrorMessage(); // reset messages
}

/**
 * Render the add-edit template with the details for adding
 * @param res The result that has to be shown to the user (the template in our case)
 * @param req The request that has been made by the user
 * @param eventType The event type information posted
 */
function renderAdd(res,req,eventType){
	// fields that have to be entered
	let fields = [{name: "Name", type: "text", identifier: "eventTypeName"}];

	/* Render Template */
	res.render('add-edit', {
		title: 'Add New Event Type',
		fields: fields,
		error: error_msg,
		message: message,
		item: {
			Name: eventType && error_msg ? eventType.eventTypeName : "",
		},
		cancelLink: listLink,
		actionLink: '/event-types/' + addLink,
		customFields: true,
		customFieldsValues: eventType && error_msg ? eventType.customFields : "",
		submitButtonText:"Add",
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
 * The List route used to list the event types in the list template
 */
router.get('/'+listLink, function(req, res) {
	if(req.user && req.user.permission >= 20) { // check if the user is either Outreach coordinator or Staff Assistant
		let columns = ["ID", "Name", "Options"]; // columns used as a header

		EventType.find({}, function (err, eventType) { // find all event types in the database
			let eventTypeList = []; // store the list of event types in here

			/* Structure only the needed information */
			eventType.forEach(function (evType) {
				eventTypeList.push({
					id: evType._id,
					name: evType.eventTypeName,
				});
			});
			/* End Structure only the needed information */

			error_msg = eventTypeList.length >= 20 ? "No results to show" : ""; // error message to show if there is no event types found

			/* Render Template */
			res.render('list', {
				title: 'Event Type List',
				list: eventTypeList,
				columns: columns,
				editLink: editLink,
				viewLink: viewLink,
				addLink: addLink,
				deleteLink: deleteLink,
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
 * The View route used to view the information of a specific event type in the view template
 */
router.get('/'+viewLink, function(req, res) {
	if(req.user && req.user.permission >= 20) { // check if the user is either Outreach coordinator or Staff Assistant
		EventType.findOne({_id: req.query.id}, function (err, eventType) { // fetch event type data from the database
			if (!err && eventType) { // no errors and event type is found in the database
				/* Render Template */
				res.render('view', {
					title: 'Viewing event type: ' + eventType.eventTypeName,
					error: null,
					item: {
						ID: eventType._id,
						Name: eventType.eventTypeName,
						customFields: eventType.customFields
					},
					listLink: listLink,
					deleteLink: deleteLink + '?id=' + eventType._id,
					editLink: editLink + '?id=' + eventType._id,
					user:req.user
				});
				/* End Render Template */
			} else { // error or event type not found
				console.log(err);

				/* Render Template */
				res.render('view', {
					error: "Event Type not found!",
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
 * into the fields that have to be entered in order to edit an event type
 * in the add-edit template
 */
router.get('/'+editLink, function(req, res) {
	if(req.user && req.user.permission >= 20) { // check if the user is either Outreach coordinator or Staff Assistant
		EventType.findOne({_id: req.query.id}, function (err, eventType) { // fetch event type data from the database
			if (!err && eventType) { // no errors and event type is found in the database
				eventType['id'] = eventType._id;
				renderEdit(res,req,eventType); // render add-edit
			} else { // error or event type not found
				console.log(err);

				/* Render Template */
				res.render('edit', {
					error: "Event type not found!",
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
		let eventType = { // structure the posted data into an object
			id:req.body.id,
			eventTypeName:req.body.eventTypeName,
			customFields:getCustomFields(req)
		};

		// the updates that have to be saved
		let updates = {$set: {eventTypeName: req.body.eventTypeName, customFields: eventType.customFields}};

		EventType.updateOne({_id: req.body.id}, updates, {runValidators: true}, function (err) { // update the event type
			if (!err) {
				message = "Successfully updated event type: " + req.body.eventTypeName; // message for success

				renderEdit(res,req,eventType); // render add-edit
			} else { // error while updating event type
				error_msg = validationErr(err); // error message from validation

				renderEdit(res,req,eventType); // render add-edit
			}
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

/**
 * The Add route with a get method used to display the fields that have to be populated
 * in order to insert event type to the database
 */
router.get('/'+addLink, function(req, res) {
	if(req.user && req.user.permission >= 20) { // check if the user is either Outreach coordinator or Staff Assistant
		renderAdd(res,req,null); // render add-edit
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

/**
 * The Add route with a post method used to insert the populated fields into the database
 * and populate the fields again into the template just in case any error happens
 * and render the add-edit template again
 */
router.post('/'+addLink, function(req, res) {
	if(req.user && req.user.permission >= 20) { // check if the user is either Outreach coordinator or Staff Assistant
		let eventType_object = {}; // the temporary event type object

		/* Assign the event type fields from the posted fields */
		eventType_object['eventTypeName'] = req.body.eventTypeName;
		eventType_object['customFields'] = getCustomFields(req);
		/* End Assign the event type fields from the posted fields */

		let new_eventType = new EventType(eventType_object); // create new event type object to store in the database

		/* Insert new event type */
		new_eventType.save(function (error) { // insert into the database
			if (!error) {
				message = "Successfully added new event type: " + req.body.eventTypeName; // success message
			} else { // error while inserting data
				error_msg = validationErr(error); // validation error
			}

			renderAdd(res,req,eventType_object); // render add-edit
		});
		/* End Insert new event type */
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
		EventType.deleteOne({_id: req.query.id}, function (err) { // delete event type from the database
			if (!err) {
				/* Render Template */
				res.render('view', {
					deleteMsg: "Successfully deleted event type!",
					listLink: listLink,
					user:req.user
				});
				/* End Render Template */
			} else { // error while deleting event type
				console.log(err);

				/* Render Template */
				res.render('view', {
					error: "Event type not found!",
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
