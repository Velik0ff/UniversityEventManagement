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

let error_msg = null;
let message = null;
let fields = [{name: "Name", type: "text", identifier: "Name"},
	{name: "Capacity", type: "number", identifier: "Capacity"}];

/* Functions */
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

function resetErrorMessage(){
	error_msg = null;
	message = null;
}

function renderAdd(res,req,custom_fields){
	res.render('add', {
		title: 'Add New Room',
		fields: fields,
		item: {
			Name: req.body.Name,
			Capacity: req.body.Capacity,
		},
		cancelLink: listLink,
		addLink: '/rooms/' + addLink,
		customFields: true,
		customFieldsValues: custom_fields,
		error: error_msg,
		message: message,
		user:req.user
	});

	resetErrorMessage();
}

function renderEdit(res,req,room,custom_fields){
	res.render('edit', {
		title: 'Editing room: ' + room.roomName,
		error: error_msg,
		errorCritical: false,
		message: message,
		item: {
			ID: room._id,
			Name: room.roomName,
			Capacity: room.capacity,
			customFieldsValues: custom_fields
		},
		customFields: true,
		editLink: '/rooms/' + editLink,
		cancelLink: viewLink + '?id=' + room._id,
		user:req.user
	});

	resetErrorMessage();
}
/* End Functions */

router.get('/'+listLink, function(req, res) {
	if(req.user && req.user.permission >= 20) {
		let columns = ["ID", "Name", "Capacity", "Options"];

		Room.find({}, function (err, rooms) {
			let roomList = [];

			rooms.forEach(function (room) {
				roomList.push({
					id: room._id,
					name: room.roomName,
					capacity: room.capacity,
				});
			});

			error_msg = rooms.length === 0 ? "No results to show" : ""

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
		Room.findOne({_id: req.query.id}, function (err, room) {
			if (!err && room) {
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
			} else {
				res.render('view', {
					error: "Room not found!",
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
		Room.findOne({_id: req.query.id}, function (err, room) {
			if (!err && room) {
				renderEdit(res,req,room,room.customFields);
			} else {
				res.render('edit', {
					error: "Room not found!",
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

		let updates = {$set: {roomName: req.body.Name, capacity: req.body.Capacity, customFields: custom_fields}};

		let room = {
			_id:req.body.ID,
			roomName:req.body.Name,
			capacity:req.body.Capacity
		};

		Room.updateOne({_id: req.body.ID}, updates, {runValidators: true}, function (err, update) {
			if (!err && update) {
				message = "Successfully updated room: " + req.body.Name;

				renderEdit(res,req,room,custom_fields);
			} else if (!update) {
				res.render('edit', {
					error: "Room not found!",
					errorCritical: true,
					listLink: listLink,
					user:req.user
				});

				resetErrorMessage();
			} else {
				error_msg = validationErr(err);

				renderEdit(res,req,room,custom_fields);
			}
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/'+addLink, function(req, res, ) {
	if(req.user && req.user.permission >= 20) {
		renderAdd(res,req,null);
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.post('/'+addLink, function(req, res) {
	if(req.user && req.user.permission >= 20) {
		let room_object = {};
		let custom_fields = [];

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

		/* Insert new equipment */
		new_room.save(function (error) {
			if (!error) {
				message = "Successfully added new room: " + req.body.Name;
				console.log(message);
			} else {
				error_msg = validationErr(error);
			}

			renderAdd(res,req,custom_fields);
		});
		/* End Insert new equipment */
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/'+deleteLink, function(req, res) {
	if(req.user && req.user.permission >= 30) {
		Room.deleteOne({_id: req.query.id}, function (err) {
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

			resetErrorMessage();
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

module.exports = router;
