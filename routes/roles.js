const express = require('express');
const router = express.Router();

/* Model */
const Role = require('../models/Role');
/* End Model */

const editLink = "edit-role";
const viewLink = "view-role";
const addLink = "add-role";
const deleteLink = "delete-role";
const listLink = "list-roles";

let error_msg = null;
let message = null;
let fields = [{name: "Role Name", type: "text", identifier: "Name"},
	{name: "Permission Level", type: "number", identifier: "Permission Level"}];

/* Functions */
function validationErr(error){
	let local_error_msg = "";

	if(error.name === "ValidationError"){ // check if the error is from the validator
		if (typeof error.errors.roleName !== "undefined" &&
			error.errors.roleName !== null) {
			local_error_msg = error.errors.roleName.message
		}
		if (typeof error.errors.rolePermission !== "undefined" &&
			error.errors.rolePermission !== null) {
			local_error_msg = error.errors.rolePermission.message
		}
		console.log(local_error_msg);
	} else {
		local_error_msg = "Unknown error has occurred during adding role. Please try again later.";
		console.log(error);
	}

	return local_error_msg;
}

function resetErrorMessage(){
	error_msg = null;
	message = null;
}

function renderEdit(res,req,role){
	res.render('edit', {
		title: 'Editing role: ' + role.roleName,
		error: error_msg,
		message: message,
		item: {
			ID: role._id,
			'Role Name': role.roleName,
			'Permission Level': role.rolePermission
		},
		customFields: false,
		editLink: '/roles/' + editLink,
		cancelLink: viewLink + '?id=' + role._id,
		user:req.user
	});

	resetErrorMessage();
}

function renderAdd(res,req){
	res.render('add', {
		title: 'Add New Role',
		fields: fields,
		item: {
			'Role Name': req.body['Role Name'],
			'Permission Level': req.body['Permission Level']
		},
		cancelLink: listLink,
		addLink: '/roles/' + addLink,
		customFields: false,
		error: error_msg,
		message: message,
		user:req.user
	});

	resetErrorMessage();
}
/* End Functions */

router.get('/'+listLink, function(req, res) {
	if(req.user && req.user.permission >= 30) {
		let columns = ["ID", "Name", "Permission Level", "Options"];

		Role.find({}, function (err, roles) {
			let roleList = [];

			roles.forEach(function (role) {
				roleList.push({
					id: role._id,
					name: role.roleName,
					rolePermission: role.rolePermission,
				});
			});

			error_msg = roles.length === 0 ? "No results to show" : "";

			res.render('list', {
				title: 'Roles List',
				list: roleList,
				columns: columns,
				editLink: editLink,
				viewLink: viewLink,
				addLink: addLink,
				deleteLink: deleteLink,
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
	if(req.user && req.user.permission >= 30) {
		/* Logic to get info from database */
		Role.findOne({_id: req.query.id}, function (err, role) {
			if (!err && role) {
				res.render('view', {
					title: 'Viewing role: ' + role.roleName,
					error: error_msg,
					item: {
						ID: role._id,
						'Role Name': role.roleName,
						'Permission Level': role.rolePermission
					},
					listLink: listLink,
					deleteLink: deleteLink + '?id=' + role._id,
					editLink: editLink + '?id=' + role._id,
					user:req.user
				});
			} else {
				res.render('view', {
					error: "Role not found!",
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
	if(req.user && req.user.permission >= 30) {
		Role.findOne({_id: req.query.id}, function (err, role) {
			if (!err && role) {
				renderEdit(res,req,role);
			} else {
				res.render('edit', {
					error: "Role not found!",
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
	if(req.user && req.user.permission >= 30) {
		let updates = {$set: {roleName: req.body['Role Name'], rolePermission: req.body['Permission Level']}};

		Role.updateOne({_id: req.body.ID}, updates, {runValidators: true}, function (err, update) {
			let role = {
				_id:req.body.ID,
				roleName:req.body['Role Name'],
				rolePermission:req.body['Permission Level']
			};

			if (!err && update) {
				message = "Successfully updated role: " + req.body['Role Name'];

				renderEdit(res,req,role);
			} else if (!update) {
				res.render('edit', {
					error: "Role not found!",
					errorCritical: true,
					listLink: listLink,
					user:req.user
				});

				resetErrorMessage();
			} else {
				error_msg = validationErr(err);

				renderEdit(res,req,role);
			}
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/'+addLink, function(req, res) {
	if(req.user && req.user.permission >= 30) {
		renderAdd(res,req);
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.post('/'+addLink, function(req, res) {
	if(req.user && req.user.permission >= 30) {
		let new_role = new Role({
			roleName: req.body["Role Name"],
			rolePermission: req.body["Permission Level"]
		});

		/* Insert new equipment */
		new_role.save(function (error) {
			if (!error) {
				message = "Successfully added new role: " + req.body["Role Name"];
				console.log(message);
			} else {
				error_msg = validationErr(error);
			}

			renderAdd(res,req);
		});
		/* End Insert new equipment */
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/'+deleteLink, function(req, res) {
	if(req.user && req.user.permission >= 30) {
		Role.deleteOne({_id: req.query.id}, function (err) {
			if (!err) {
				res.render('view', {
					deleteMsg: "Successfully deleted role!",
					listLink: listLink,
					user:req.user
				});
			} else {
				console.log(err); // console log the error
				res.render('view', {
					error: "Role not found!",
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
