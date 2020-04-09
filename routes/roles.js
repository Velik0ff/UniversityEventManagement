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

/* Functions */
function validationErr(error){
	var error_msg = "";

	if(error.name === "ValidationError"){ // check if the error is from the validator
		if (typeof error.errors.roleName !== "undefined" &&
			error.errors.roleName !== null) {
			error_msg = error.errors.roleName.message
		}
		if (typeof error.errors.rolePermission !== "undefined" &&
			error.errors.rolePermission !== null) {
			error_msg = error.errors.rolePermission.message
		}
		console.log(error_msg);
	} else {
		error_msg = "Unknown error has occurred during adding room. Please try again later.";
		console.log(error);
	}

	return error_msg;
}


/* End Functions */

router.get('/'+listLink, function(req, res, next) {
	if(req.user && req.user.permission >= 30) {
		let columns = ["ID", "Name", "Permission Level", "Options"];
		var error = "";

		Role.find({}, function (err, roles) {
			var roleList = [];

			roles.forEach(function (role) {
				roleList.push({
					id: role._id,
					name: role.roleName,
					rolePermission: role.rolePermission,
				});
			});

			error = roles.length === 0 ? "No results to show" : ""

			res.render('list', {
				title: 'Roles List',
				list: roleList,
				columns: columns,
				editLink: editLink,
				viewLink: viewLink,
				addLink: addLink,
				deleteLink: deleteLink,
				error: error,
				user:req.user
			});
		});
	} else {
		res.redirect('/');
	}
});

router.get('/'+viewLink, function(req, res, next) {
	if(req.user && req.user.permission >= 30) {
		/* Logic to get info from database */
		Role.findOne({_id: req.query.id}, function (err, role) {
			if (!err && room) {
				res.render('view', {
					title: 'Viewing role: ' + role.roleName,
					error: null,
					// rows: rows,
					item: {
						ID: role._id,
						'Role Name': role.roleName,
						'Permission Level': role.rolePermission
					},
					listLink: listLink,
					deleteLink: deleteLink,
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
		});
		/* End Logic to get info from database */
	} else {
		res.redirect('/');
	}
});

function renderEdit(){

}

router.get('/'+editLink, function(req, res, next) {
	if(req.user && req.user.permission >= 30) {
		Role.findOne({_id: req.query.id}, function (err, role) {
			if (!err && role) {
				res.render('edit', {
					title: 'Editing role: ' + role.roleName,
					error: null,
					// rows: rows,
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
			} else {
				res.render('edit', {
					error: "Role not found!",
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
	if(req.user && req.user.permission >= 30) {
		let updates = {$set: {roleName: req.body['Role Name'], rolePermission: req.body['Permission Level']}};

		Role.updateOne({_id: req.body.ID}, updates, {runValidators: true}, function (err, update) {
			if (!err && update) {
				res.render('edit', {
					title: 'Editing role: ' + req.body['Role Name'],
					error: null,
					errorCritical: false,
					message: "Successfully updated role: " + req.body['Role Name'],
					item: {
						ID: req.body.ID,
						'Role Name': req.body['Role Name'],
						'Permission Level': req.body['Permission Level']
					},
					customFields: false,
					editLink: '/roles/' + editLink,
					cancelLink: viewLink + '?id=' + req.body.ID,
					user:req.user
				});
			} else if (!update) {
				res.render('edit', {
					error: "Role not found!",
					errorCritical: true,
					listLink: listLink,
					user:req.user
				});
			} else {
				let error = validationErr(err);

				res.render('edit', {
					title: 'Editing role: ' + req.body.Name,
					error: error,
					errorCritical: false,
					message: null,
					item: {
						ID: req.body.ID,
						'Role Name': req.body['Role Name'],
						'Permission Level': req.body['Permission Level']
					},
					customFields: false,
					editLink: '/roles/' + editLink,
					cancelLink: viewLink + '?id=' + req.body.ID,
					user:req.user
				});
			}
		});
	} else {
		res.redirect('/');
	}
});

router.get('/'+addLink, function(req, res, next) {
	if(req.user && req.user.permission >= 30) {
		let fields = [{name: "Role Name", type: "text", identifier: "Name"},
			{name: "Permission Level", type: "number", identifier: "Permission Level"}];

		res.render('add', {
			title: 'Add New Role',
			fields: fields,
			cancelLink: listLink,
			customFields: false,
			user:req.user
		});
	} else {
		res.redirect('/');
	}
});

router.post('/'+addLink, function(req, res, next) {
	if(req.user && req.user.permission >= 30) {
		var error_msg = "";
		var message = "";
		let fields = [{name: "Role Name", type: "text", identifier: "Role Name"},
			{name: "Permission Level", type: "number", identifier: "Permission Level"}];

		let new_role = new Role({
			roleName: req.body["Role Name"],
			rolePermission: req.body["Permission Level"]
		});

		function renderScreen() {
			res.render('add', {
				title: 'Add New Role',
				fields: fields,
				cancelLink: listLink,
				addLink: '/roles/' + addLink,
				customFields: false,
				error: error_msg,
				message: message,
				user:req.user
			});
		}

		/* Insert new equipment */
		new_role.save(function (error, roomDoc) {
			if (!error) {
				message = "Successfully added new role: " + req.body["Role Name"];
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

router.get('/'+deleteLink, function(req, res, next) {
	if(req.user && req.user.permission >= 30) {
		Role.deleteOne({_id: req.query.id}, function (err, deleteResult) {
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
		});
	} else {
		res.redirect('/');
	}
});

module.exports = router;
