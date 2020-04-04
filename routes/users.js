const express = require('express');
const router = express.Router();
const short = require('short-uuid');
const genFunctions = require('../functions/generalFunctions');

/* Model */
const User = require('../models/staff_user');
const Visitor = require('../models/visitor_user');
/* End Model */

/* Links */
const viewLink = "view-user";
const editLink = "edit-user";
const addLink = "add-user";
const deleteLink = "delete-user";
const listLink = "list-users";
const resetPassLink = "reset-password";
const exportLink = "../export?type=Staff";
/* End Links */

/* Functions */
function validationErr(error) {
	var error_msg = "";

	if (error.name === "ValidationError") { // check if the error is from the validator
		if (typeof error.errors.fullName !== "undefined" &&
			error.errors.fullName !== null) {
			error_msg = error.errors.fullName.message
		}
		if (typeof error.errors.email !== "undefined" &&
			error.errors.email !== null) {
			error_msg = error.errors.email.message
		}
		if (typeof error.errors.role !== "undefined" &&
			error.errors.role !== null) {
			error_msg = error.errors.role.message
		}
		console.log(error_msg);
	} else {
		if (error.code === 11000) { // duplicate entry
			error_msg = "Email already exists.";
		} else { // unknown error
			error_msg = "Unknown error has occurred during adding of the user. Please try again later.";
			console.log(error);
		}
	}

	return error_msg;
}
/* End Functions */

router.get('/' + listLink, function (req, res, next) {
	if (req.user && req.user.permission === 0) {
		let columns = ["ID", "Full Name", "Email", "Options"];
		let error = "";

		User.find({}, function (err, users) {
			let userList = [];
			let staffRoles = [];

			users.forEach(function (user) {
				userList.push({
					id: user._id,
					name: user.fullName,
					email: user.email
				});

				if (user.role.includes(',')) {
					let staff_member_roles_arr = user.role.split(',');

					staff_member_roles_arr.forEach(function(staff_role){
						if(!staffRoles.includes(staff_role)) {
							staffRoles.push(staff_role);
						}
					});
				} else {
					if (!staffRoles.includes(user.role)) {
						staffRoles.push(user.role);
					}
				}
			});

			error = userList.length === 0 ? "No results to show" : "";

			res.render('list', {
				title: 'Staff List',
				filter: 'Staff',
				type: 'staff',
				staffRoles: staffRoles,
				list: userList,
				columns: columns,
				editLink: editLink,
				viewLink: viewLink,
				addLink: addLink,
				deleteLink: deleteLink,
				exportLink: exportLink,
				error: error,
				user: req.user
			});
		});
	} else {
		res.redirect('/');
	}
});

router.get('/' + viewLink, function (req, res, next) {
	if (req.user && req.user.permission === 0) {
		/* Logic to get info from database */
		User.findOne({_id: req.query.id}, function (err, user) {
			if (!err && user) {
				res.render('view', {
					title: 'Viewing staff member: ' + user.fullName,
					error: null,
					// rows: rows,
					item: {
						ID: user._id,
						Name: user.fullName,
						Email: user.email,
						Role: user.role
					},
					listLink: listLink,
					deleteLink: deleteLink + '?id=' + user._id,
					editLink: editLink + '?id=' + user._id,
					resetPassLink: resetPassLink + '?id=' + user._id,
					user: req.user
				});
			} else {
				res.render('view', {
					error: "User not found!",
					listLink: listLink,
					user: req.user
				});
			}
		});
		/* End Logic to get info from database */
	} else {
		res.redirect('/');
	}
});

router.get('/' + addLink, function (req, res, next) {
	if (req.user && req.user.permission === 0) {
		let fields = [{name: "Name", type: "text", identifier: "name"},
			{name: "Email", type: "email", identifier: "email"},
			{name: "Phone", type: "tel", identifier: "phone"},
			{name: "Role", type: "text", identifier: "role"}]

		res.render('add', {
			title: 'Add New Staff Member',
			fields: fields,
			cancelLink: listLink,
			addLink: '/users/' + addLink,
			customFields: false,
			error: null,
			message: null,
			user: req.user
		});
	} else {
		res.redirect('/');
	}
});

router.get('/' + editLink, function (req, res, next) {
	if ((req.user && req.user.permission === 0) || (req.user && req.user.permission === 0 && req.user._id === req.query.id)) {
		User.findOne({_id: req.query.id}, function (err, user) {
			if (!err && user) {
				res.render('edit', {
					title: 'Editing staff member: ' + user.fullName,
					error: null,
					item: {
						ID: user._id,
						Name: user.fullName,
						Email: user.email,
						Role: user.role
					},
					editLink: '/users/' + editLink,
					cancelLink: req.user.permission === 0 ? viewLink + '?id=' + req.body.ID : '../events/participate-events-list',
					user: req.user
				});
			} else {
				res.render('edit', {
					error: "User not found!",
					listLink: listLink,
					user: req.user
				});
			}
		});
	} else {
		res.redirect('/');
	}
});

router.get('/' + deleteLink, function (req, res, next) {
	if (req.user && req.user.permission === 0) {
		User.deleteOne({_id: req.query.id}, function (err, deleteResult) {
			if (!err) {
				res.render('view', {
					deleteMsg: "Successfully deleted user!",
					listLink: listLink,
					user: req.user
				});
			} else {
				console.log(err); // console log the error
				res.render('view', {
					error: "User not found!",
					listLink: listLink,
					user: req.user
				});
			}
		});
	} else {
		res.redirect('/');
	}
});

router.post('/' + editLink, function (req, res, next) {
	if ((req.user && req.user.permission === 0) || (req.user && req.user.permission === 0 && req.user._id === req.query.id)) {
		let updates = {$set: {fullName: req.body.Name, email: req.body.Email, role: req.body.Role, phone: req.body.Phone}}

		User.updateOne({_id: req.body.ID}, updates, {runValidators: true}, function (err, update) {
			if (!err && update) {
				res.render('edit', {
					title: 'Editing staff member: ' + req.body.Name,
					error: null,
					errorCritical: false,
					message: "Successfully updated user: " + req.body.Email,
					item: {
						ID: req.body.ID,
						Name: req.body.Name,
						Email: req.body.Email,
						Phone: req.body.Phone,
						Role: req.body.Role
					},
					editLink: '/users/' + editLink,
					cancelLink: req.user.permission === 0 ? viewLink + '?id=' + req.body.ID : '../events/participate-events-list',
					user: req.user
				});
			} else if (!update) {
				res.render('edit', {
					error: "User not found!",
					errorCritical: true,
					listLink: listLink,
					user: req.user
				});
			} else {
				let error = validationErr(err);

				res.render('edit', {
					title: 'Editing staff member: ' + req.body.Name,
					error: error,
					errorCritical: false,
					message: null,
					item: {
						ID: req.body.ID,
						Name: req.body.Name,
						Email: req.body.Email,
						Phone: req.body.Phone,
						Role: req.body.Role
					},
					editLink: '/users/' + editLink,
					cancelLink: req.user.permission === 0 ? viewLink + '?id=' + req.body.ID : '../events/participate-events-list',
					user: req.user
				});
			}
		});
	} else {
		res.redirect('/');
	}
});

router.post('/' + addLink, function (req, res, next) {
	if (req.user && req.user.permission === 0) {
		var error_msg = "";
		var message = "";
		let password_to_insert = short().new();
		let fields = [{name: "Name", type: "text", identifier: "name"},
			{name: "Email", type: "email", identifier: "email"},
			{name: "Phone", type: "tel", identifier: "phone"},
			{name: "Role", type: "text", identifier: "role"}];

		let new_user = new User({ // new user object to be inserted
			fullName: req.body.Name,
			email: req.body.Email,
			password: password_to_insert,
			role: req.body.Role,
			permission: -1,
			phone: req.body.Phone ? req.body.Phone : null
		});

		function renderScreen() {
			res.render('add', {
				title: 'Add New Staff Member',
				// rows: rows,
				fields: fields,
				cancelLink: listLink,
				addLink: '/users/' + addLink,
				customFields: false,
				error: error_msg,
				message: message,
				user: req.user
			});
		}

		/* Insert new user */
		new_user.save(function (error, userDoc) {
			if (!error) {
				message = "Successfully added new user with email: " + req.body.Email;
				console.log(message);
				genFunctions.sendEmail(req.body.Email, password_to_insert, req.body.Role, 'staff');
			} else {
				error_msg = validationErr(error);
			}

			renderScreen();
		});
		/* End Insert new user */
	} else {
		res.redirect('/');
	}
});

router.get('/' + resetPassLink, function (req, res, next) {
	if (req.user && req.user.permission === 0) {

		function renderView(message,error){
			res.render('view', {
				resetMsg: message,
				error: error,
				listLink: listLink,
				user: req.user
			});
		}

		if (req.query.id) {
			let error = null;
			let message = null;

			User.findOne({_id: req.query.id}, function (errFind, user) {
				if (!errFind) {
					let password = short().new();

					User.updateOne({_id: req.query.id}, {
						$set: {
							permission: -1,
							password: user.hashPassword(password)
						}
					}, function (err, userDoc) {
						if (err) {
							console.log(err);
							error = "Unknown error has occurred please try again!";
						} else {
							genFunctions.sendEmail(user.email, password, null, 'reset-pass');
							message = "Successfully reset password of the user.";
						}

						renderView(message,error)
					});
				} else {
					console.log(errFind);
					renderView(message,"Unknown error has occurred please try again!");
				}
			});
		} else {
			console.log('No id is posted for reset password of the user.');
			renderView(message,"Unknown error has occurred please try again!");
		}
	} else {
		res.redirect('/welcome');
	}
});

module.exports = router;
