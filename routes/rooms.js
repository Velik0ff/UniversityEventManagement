const express = require('express');
const router = express.Router();

/* Model */
const Room = require('../models/Room');
/* End Model */

const editLink = "edit-room";
const viewLink = "view-room";
const addLink = "add-room";
const deleteLink = "delete-room";
const listLink = "list-rooms";
const exportLink = "../export?type=Rooms";

function validationErr(error){
	var error_msg = "";

	if(error.name === "ValidationError"){ // check if the error is from the validator
		if (typeof error.errors.roomName !== "undefined" &&
			error.errors.roomName !== null) {
			error_msg = error.errors.roomName.message
		}
		if (typeof error.errors.capacity !== "undefined" &&
			error.errors.capacity !== null) {
			error_msg = error.errors.capacity.message
		}
		console.log(error_msg);
	} else {
		error_msg = "Unknown error has occurred during adding room. Please try again later.";
		console.log(error);
	}

	return error_msg;
}

router.get('/'+listLink, function(req, res, next) {
	if(req.user && req.user.permission === 0) {
		let columns = ["ID", "Name", "Capacity", "Options"];
		var error = "";

		Room.find({}, function (err, rooms) {
			var roomList = [];

			rooms.forEach(function (room) {
				roomList.push({
					id: room._id,
					name: room.roomName,
					capacity: room.capacity,
				});
			});

			error = rooms.length === 0 ? "No results to show" : ""

			res.render('list', {
				title: 'Rooms List',
				list: roomList,
				filter: "Rooms",
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
		Room.findOne({_id: req.query.id}, function (err, room) {
			if (!err && room) {
				res.render('view', {
					title: 'Viewing room: ' + room.roomName,
					error: null,
					// rows: rows,
					item: {
						ID: room._id,
						Name: room.roomName,
						Capacity: room.capacity,
						customFields: room.customFields
					},
					listLink: listLink,
					deleteLink: deleteLink,
					editLink: editLink + '?id=' + room._id,
					user:req.user
				});
			} else {
				res.render('view', {
					error: "Room not found!",
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
		Room.findOne({_id: req.query.id}, function (err, room) {
			if (!err && room) {
				res.render('edit', {
					title: 'Editing equipment: ' + room.typeName,
					error: null,
					// rows: rows,
					item: {
						ID: room._id,
						Name: room.roomName,
						Capacity: room.capacity,
						customFieldsValues: room.customFields
					},
					customFields: true,
					editLink: '/equipment/' + editLink,
					cancelLink: viewLink + '?id=' + room._id,
					user:req.user
				});
			} else {
				res.render('edit', {
					error: "Equipment not found!",
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
		let fields = [{name: "Name", type: "text", identifier: "Name"},
			{name: "Capacity", type: "number", identifier: "Capacity"}];

		res.render('add', {
			title: 'Add New Room',
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
		Room.deleteOne({_id: req.query.id}, function (err, deleteResult) {
			if (!err) {
				res.render('view', {
					deleteMsg: "Successfully deleted room!",
					listLink: listLink,
					user:req.user
				});
			} else {
				console.log(err); // console log the error
				res.render('view', {
					error: "Room not found!",
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
				if (field_post_key !== "ID" && field_post_key !== "Name" && field_post_key !== "Capacity") {
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

		let updates = {$set: {roomName: req.body.Name, capacity: req.body.Capacity, customFields: custom_fields}}

		Room.updateOne({_id: req.body.ID}, updates, {runValidators: true}, function (err, update) {
			if (!err && update) {
				res.render('edit', {
					title: 'Editing room: ' + req.body.Name,
					error: null,
					errorCritical: false,
					message: "Successfully updated room: " + req.body.Name,
					item: {
						ID: req.body.ID,
						Name: req.body.Name,
						Capacity: req.body.Capacity,
						customFieldsValues: custom_fields
					},
					customFields: true,
					editLink: '/rooms/' + editLink,
					cancelLink: viewLink + '?id=' + req.body.ID,
					user:req.user
				});
			} else if (!update) {
				res.render('edit', {
					error: "Room not found!",
					errorCritical: true,
					listLink: listLink,
					user:req.user
				});
			} else {
				let error = validationErr(err);

				res.render('edit', {
					title: 'Editing room: ' + req.body.Name,
					error: error,
					errorCritical: false,
					message: null,
					item: {
						ID: req.body.ID,
						Name: req.body.Name,
						Capacity: req.body.Capacity,
						customFieldsValues: custom_fields
					},
					customFields: true,
					editLink: '/rooms/' + editLink,
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
		let fields = [{name: "Name", type: "text", identifier: "Name"},
			{name: "Capacity", type: "number", identifier: "Capacity"}]

		var room_object = {};
		var custom_fields = [];

		room_object['roomName'] = req.body.Name;
		room_object['capacity'] = req.body.Capacity;

		for (const [field_post_key, field_post_value] of Object.entries(req.body)) {
			if (req.body.hasOwnProperty(field_post_key)) {
				if (field_post_key !== "Name" && field_post_key !== "Capacity") {
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

		room_object['customFields'] = custom_fields;

		let new_room = new Room(room_object);

		function renderScreen() {
			res.render('add', {
				title: 'Add New Room',
				fields: fields,
				cancelLink: listLink,
				addLink: '/rooms/' + addLink,
				customFields: true,
				customFieldsValues: custom_fields,
				error: error_msg,
				message: message,
				user:req.user
			});
		}

		/* Insert new equipment */
		new_room.save(function (error, roomDoc) {
			if (!error) {
				message = "Successfully added new room: " + req.body.Name;
				console.log(message);
			} else {
				error_msg = validationErr(error);
			}

			renderScreen();
		});
		/* End Insert new equipment */
	} else {
		res.redirect('/');
	}
});

module.exports = router;
