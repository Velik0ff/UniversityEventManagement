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

function validationErr(error){
	var error_msg = "";

	if(error.name === "ValidationError"){ // check if the error is from the validator
		if (typeof error.errors.eventTypeName !== "undefined" &&
			error.errors.eventTypeName !== null) {
			error_msg = error.errors.eventTypeName.message
		}
		console.log(error_msg);
	} else {
		error_msg = "Unknown error has occurred during adding event type. Please try again later.";
		console.log(error);
	}

	return error_msg;
}

router.get('/'+listLink, function(req, res, next) {
	if(req.user && req.user.permission === 0) {
		let columns = ["ID", "Name", "Options"];
		var error = "";

		EventType.find({}, function (err, eventType) {
			var eventTypeList = [];

			eventType.forEach(function (evType) {
				eventTypeList.push({
					id: evType._id,
					name: evType.eventTypeName,
				});
			});

			error = eventTypeList.length === 0 ? "No results to show" : ""

			res.render('list', {
				title: 'Event Type List',
				list: eventTypeList,
				columns: columns,
				editLink: editLink,
				viewLink: viewLink,
				addLink: addLink,
				deleteLink: deleteLink,
				exportLink: exportLink,
				error: error,
				user:req.user
			});
		});
	} else {
		res.redirect('/');
	}
});

router.get('/'+viewLink, function(req, res, next) {
	if(req.user && req.user.permission === 0) {
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
		});
		/* End Logic to get info from database */
	} else {
		res.redirect('/');
	}
});

router.get('/'+editLink, function(req, res, next) {
	if(req.user && req.user.permission === 0) {
		EventType.findOne({_id: req.query.id}, function (err, eventType) {
			if (!err && eventType) {
				res.render('edit', {
					title: 'Editing event type: ' + eventType.eventTypeName,
					error: null,
					// rows: rows,
					item: {
						ID: eventType._id,
						Name: eventType.eventTypeName,
						Quantity: eventType.quantity,
						customFieldsValues: eventType.customFields
					},
					customFields: true,
					editLink: '/event-types/' + editLink,
					cancelLink: viewLink + '?id=' + eventType._id,
					user:req.user
				});
			} else {
				res.render('edit', {
					error: "Event type not found!",
					listLink: listLink,
					user:req.user
				});
			}
		});
	} else {
		res.redirect('/');
	}
});

router.get('/'+addLink, function(req, res, next) {
	if(req.user && req.user.permission === 0) {
		let fields = [{name: "Name", type: "text", identifier: "Name"}];

		res.render('add', {
			title: 'Add New Event Type',
			fields: fields,
			cancelLink: listLink,
			customFields: true,
			user:req.user
		});
	} else {
		res.redirect('/');
	}
});

router.get('/'+deleteLink, function(req, res, next) {
	if(req.user && req.user.permission === 0) {
		EventType.deleteOne({_id: req.query.id}, function (err, deleteResult) {
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
		});
	} else {
		res.redirect('/');
	}
});

router.post('/'+editLink, function(req, res, next) {
	if(req.user && req.user.permission === 0) {
		var custom_fields = [];

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

		let updates = {$set: {eventTypeName: req.body.Name, customFields: custom_fields}}

		EventType.updateOne({_id: req.body.ID}, updates, {runValidators: true}, function (err, update) {
			if (!err && update) {
				res.render('edit', {
					title: 'Editing event type: ' + req.body.Name,
					error: null,
					errorCritical: false,
					message: "Successfully updated event type: " + req.body.Name,
					item: {
						ID: req.body.ID,
						Name: req.body.Name,
						customFieldsValues: custom_fields
					},
					customFields: true,
					editLink: '/event-types/' + editLink,
					cancelLink: viewLink + '?id=' + req.body.ID,
					user:req.user
				});
			} else if (!update) {
				res.render('edit', {
					error: "Event type not found!",
					errorCritical: true,
					listLink: listLink,
					user:req.user
				});
			} else {
				let error = validationErr(err);

				res.render('edit', {
					title: 'Editing event type: ' + req.body.Name,
					error: error,
					errorCritical: false,
					message: null,
					item: {
						ID: req.body.ID,
						Name: req.body.Name,
						customFieldsValues: custom_fields
					},
					customFields: true,
					editLink: '/event-types/' + editLink,
					cancelLink: viewLink + '?id=' + req.body.ID,
					user:req.user
				});
			}
		});
	} else {
		res.redirect('/');
	}
});

router.post('/'+addLink, function(req, res, next) {
	if(req.user && req.user.permission === 0) {
		var error_msg = "";
		var message = "";
		let fields = [{name: "Name", type: "text", identifier: "Name"}]

		var eventType_object = {};
		var custom_fields = [];

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

		function renderScreen() {
			res.render('add', {
				title: 'Add New Event Type',
				fields: fields,
				cancelLink: listLink,
				addLink: '/event-types/' + addLink,
				customFields: true,
				customFieldsValues: custom_fields,
				error: error_msg,
				message: message,
				user:req.user
			});
		}

		/* Insert new event type */
		new_eventType.save(function (error, eventTypeDoc) {
			if (!error) {
				message = "Successfully added new event type: " + req.body.Name;
				console.log(message);
			} else {
				error_msg = validationErr(error);
			}

			renderScreen();
		});
		/* End Insert new event type */
	} else {
		res.redirect('/');
	}
});

module.exports = router;
