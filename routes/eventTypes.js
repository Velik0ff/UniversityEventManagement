const express = require('express');
const router = express.Router();

/* Model */
const EventType = require('../models/EventType');
/* End Model */

const editLink = "edit-event-type";
const viewLink = "view-event-type";
const addLink = "add-event-type";
const deleteLink = "delete-event-type";
const listLink = "list-event-type";
const exportLink = "../export?type=Event Types";

let error_msg = null;
let message = null;
let fields = [{name: "Name", type: "text", identifier: "Name"}];

/* Functions */
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

function resetErrorMessage(){
	error_msg = null;
	message = null;
}

function renderEdit(res,req,eventType){
	res.render('edit', {
		title: 'Editing event type: ' + eventType.eventTypeName,
		error: error_msg,
		message: message,
		item: {
			ID: eventType._id,
			Name: eventType.eventTypeName,
			customFieldsValues: eventType.customFields
		},
		customFields: true,
		editLink: '/event-types/' + editLink,
		cancelLink: viewLink + '?id=' + eventType._id,
		user:req.user
	});

	resetErrorMessage();
}

function renderAdd(res,req,custom_fields){
	res.render('add', {
		title: 'Add New Event Type',
		fields: fields,
		item: {
			Name: req.body.Name,
		},
		cancelLink: listLink,
		addLink: '/event-types/' + addLink,
		customFields: true,
		customFieldsValues: custom_fields,
		error: error_msg,
		message: message,
		user:req.user
	});

	resetErrorMessage();
}
/* End Functions */

router.get('/'+listLink, function(req, res) {
	if(req.user && req.user.permission >= 20) {
		let columns = ["ID", "Name", "Options"];

		EventType.find({}, function (err, eventType) {
			let eventTypeList = [];

			eventType.forEach(function (evType) {
				eventTypeList.push({
					id: evType._id,
					name: evType.eventTypeName,
				});
			});

			error_msg = eventTypeList.length >= 20 ? "No results to show" : "";

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

			resetErrorMessage();
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/'+viewLink, function(req, res) {
	if(req.user && req.user.permission >= 20) {
		/* Logic to get info from database */
		EventType.findOne({_id: req.query.id}, function (err, eventType) {
			if (!err && eventType) {
				res.render('view', {
					title: 'Viewing event type: ' + eventType.eventTypeName,
					error: null,
					// rows: rows,
					item: {
						ID: eventType._id,
						Name: eventType.eventTypeName,
						customFields: eventType.customFields
					},
					listLink: listLink,
					deleteLink: deleteLink,
					editLink: editLink + '?id=' + eventType._id,
					user:req.user
				});
			} else {
				res.render('view', {
					error: "Event Type not found!",
					listLink: listLink,
					user:req.user
				});
			}

			resetErrorMessage();
		});
		/* End Logic to get info from database */
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/'+editLink, function(req, res) {
	if(req.user && req.user.permission >= 20) {
		EventType.findOne({_id: req.query.id}, function (err, eventType) {
			if (!err && eventType) {
				renderEdit(res,req,eventType);
			} else {
				res.render('edit', {
					error: "Event type not found!",
					listLink: listLink,
					user:req.user
				});

				resetErrorMessage();
			}
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.post('/'+editLink, function(req, res) {
	if(req.user && req.user.permission >= 20) {
		let custom_fields = [];

		for (const [field_post_key, field_post_value] of Object.entries(req.body)) {
			if (req.body.hasOwnProperty(field_post_key)) {
				if (field_post_key !== "ID" && field_post_key !== "Name") {
					if (field_post_key.includes('fieldName')) {
						custom_fields.push({
							fieldName: field_post_value,
							fieldValue: ""
						});
					} else if (field_post_key.includes('fieldValue')) {
						custom_fields[custom_fields.length - 1]['fieldValue'] = field_post_value;
					}
				}
			}
		}

		let eventType = {
			_id:req.body.ID,
			eventTypeName:req.body.Name,
			customFields:custom_fields
		};
		let updates = {$set: {eventTypeName: req.body.Name, customFields: custom_fields}};

		EventType.updateOne({_id: req.body.ID}, updates, {runValidators: true}, function (err, update) {
			if (!err && update) {
				message = "Successfully updated event type: " + req.body.Name;

				renderEdit(res,req,eventType);
			} else if (!update) {
				res.render('edit', {
					error: "Event type not found!",
					errorCritical: true,
					listLink: listLink,
					user:req.user
				});

				resetErrorMessage();
			} else {
				error_msg = validationErr(err);

				renderEdit(res,req,eventType);
			}
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/'+addLink, function(req, res) {
	if(req.user && req.user.permission >= 20) {
		renderAdd(res,req,null);
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.post('/'+addLink, function(req, res) {
	if(req.user && req.user.permission >= 20) {
		let eventType_object = {};
		let custom_fields = [];

		eventType_object['eventTypeName'] = req.body.Name;

		for (const [field_post_key, field_post_value] of Object.entries(req.body)) {
			if (req.body.hasOwnProperty(field_post_key)) {
				if (field_post_key !== "Name" && field_post_key !== "Quantity") {
					if (field_post_key.includes('fieldName')) {
						custom_fields.push({
							fieldName: field_post_value,
							fieldValue: ""
						});
					} else {
						custom_fields[custom_fields.length - 1]['fieldValue'] = field_post_value;
					}
				}
			}
		}

		eventType_object['customFields'] = custom_fields;

		let new_eventType = new EventType(eventType_object);

		/* Insert new event type */
		new_eventType.save(function (error) {
			if (!error) {
				message = "Successfully added new event type: " + req.body.Name;
				console.log(message);
			} else {
				error_msg = validationErr(error);
			}

			renderAdd(res,req,custom_fields);
		});
		/* End Insert new event type */
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/'+deleteLink, function(req, res) {
	if(req.user && req.user.permission >= 30) {
		EventType.deleteOne({_id: req.query.id}, function (err) {
			if (!err) {
				res.render('view', {
					deleteMsg: "Successfully deleted event type!",
					listLink: listLink,
					user:req.user
				});
			} else {
				console.log(err); // console log the error
				res.render('view', {
					error: "Event type not found!",
					listLink: listLink,
					user:req.user
				});
			}

			resetErrorMessage();
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

module.exports = router;
