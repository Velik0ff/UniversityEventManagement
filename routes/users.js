const express = require('express');
const router = express.Router();
const short = require('short-uuid');
const genFunctions = require('../functions/generalFunctions');

/* Model */
const User = require('../models/staff_user');
const Role = require('../models/Role');
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

let error_msg = null;
let message = null;
let password_to_insert = short().new();
let fields = [{name: "Name", type: "text", identifier: "name"},
	{name: "Email", type: "email", identifier: "email"},
	{name: "Phone", type: "tel", identifier: "phone"},
	{name: "Role", type: "text", identifier: "role"}];

/* Functions */
function validationErr(error) {
	let local_error_msg = "";

	if (error.name === "ValidationError") { // check if the error is from the validator
		if (typeof error.errors.fullName !== "undefined" &&
			error.errors.fullName !== null) {
			local_error_msg = error.errors.fullName.message
		}
		if (typeof error.errors.email !== "undefined" &&
			error.errors.email !== null) {
			local_error_msg = error.errors.email.message
		}
		if (typeof error.errors.role !== "undefined" &&
			error.errors.role !== null) {
			local_error_msg = error.errors.role.message
		}
		console.log(local_error_msg);
	} else {
		if (error.code === 11000) { // duplicate entry
			local_error_msg = "Email already exists.";
		} else { // unknown error
			local_error_msg = "Unknown error has occurred during adding of the user. Please try again later.";
			console.log(error);
		}
	}

	return local_error_msg;
}

function getStaffRoles(){
	return new Promise(function(resolve,reject){
		Role.find({},function(errRoleFind,roleDoc){
			if(errRoleFind){
				console.log(errRoleFind);
			}

			resolve(roleDoc);
		});
	});
}

function renderAdd(res,req){
	getStaffRoles().then(function(roles) {
		res.render('add', {
			title: 'Add New Staff Member',
			fields: fields,
			roles: roles,
			cancelLink: listLink,
			addLink: '/users/' + addLink,
			customFields: false,
			error: error_msg,
			message: message,
			user: req.user
		});
	});
}

function renderEdit(res,req,user){
	getStaffRoles().then(function(roles){
		res.render('edit', {
			title: 'Editing staff member: ' + user.fullName,
			error: null,
			item: {
				ID: req.body.ID,
				Name: req.body.Name,
				Email: req.body.Email,
				Phone: req.body.Phone,
				Role: req.body.Role
			},
			roles: roles,
			editLink: '/users/' + editLink,
			cancelLink: req.user.permission >= 10 ? viewLink + '?id=' + user._id : '../events/view-list',
			user: req.user
		});
	});
}
/* End Functions */

router.get('/' + listLink, function (req, res) {
	if (req.user && req.user.permission >= 10) {
		let columns = ["ID", "Full Name", "Email", "Options"];

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

			error_msg = userList.length === 0 ? "No results to show" : "";

			res.render('list', {
				title: 'Staff List',
				filter: 'Staff',
				type: 'staff',
				staffRoles: staffRoles,
				list: userList,
				columns: columns,
				editLink: req.user.permission >= 30 ? editLink : null,
				viewLink: viewLink,
				addLink: req.user.permission >= 30 ? addLink : null,
				deleteLink: req.user.permission >= 30 ? deleteLink : null,
				exportLink: req.user.permission >= 30 ? exportLink : null,
				error: error_msg,
				user: req.user
			});
		});
	} else {
		res.redirect('/');
	}
});

router.get('/' + viewLink, function (req, res) {
	if (req.user && req.user.permission >= 1) {
		/* Logic to get info from database */
		User.findOne({_id: req.query.id}, function (err, user) {
			if (!err && user) {
				res.render('view', {
					title: 'Viewing staff member: ' + user.fullName,
					error: null,
					item: {
						ID: user._id,
						Name: user.fullName,
						Email: user.email,
						Role: user.role
					},
					listLink: listLink,
					deleteLink: req.user.permission >= 30 ? deleteLink + '?id=' + user._id : null,
					editLink: req.user.permission >= 30 ? editLink + '?id=' + user._id : null,
					resetPassLink: req.user.permission >= 30 ? resetPassLink + '?id=' + user._id : null,
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
router.get('/' + addLink, function (req, res) {
	if (req.user && req.user.permission >= 30) {
		renderAdd(res,req);
	} else {
		res.redirect('/');
	}
});

router.post('/' + addLink, function (req, res) {
	if (req.user && req.user.permission >= 30) {
		Role.findOne({_id:req.body.Role},function(errFindRole,roleDoc){
			let role = null;

			if(errFindRole) console.log(errFindRole);

			if(!errFindRole && roleDoc) role = roleDoc.roleName;

			let new_user = new User({ // new user object to be inserted
				fullName: req.body.Name,
				email: req.body.Email,
				password: password_to_insert,
				role: role,
				permission: -1,
				phone: req.body.Phone ? req.body.Phone : null
			});

			/* Insert new user */

			new_user.save(function (error) {
				if (!error) {
					message = "Successfully added new user with email: " + req.body.Email;
					genFunctions.sendEmail(req.body.Email, password_to_insert, req.body.Role, null, null, 'staff');
				} else {
					error_msg = validationErr(error);
				}

				renderAdd(res,req);
			});
			/* End Insert new user */
		});
	} else {
		res.redirect('/');
	}
});

router.get('/' + editLink, function (req, res) {
	if ((req.user && req.user.permission >= 30) || (req.user && req.user.permission >= 10 && req.user._id === req.query.id)) {
		User.findOne({_id: req.query.id}, function (err, user) {
			if (!err && user) {
				renderEdit(res,req,user);
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

router.post('/' + editLink, function (req, res) {
	if ((req.user && req.user.permission >= 30) || (req.user && req.user.permission >= 10 && req.user._id === req.query.id)) {
		let updates = null;
		let role = null;
		let role_permission = -1;
		let promises = [];
		let user_permission = -1;

		if(req.user.permission >= 30){
			promises.push(new Promise(function(resolve){
				Role.findOne({_id:req.body.Role},function(errFindRole,roleDoc){
					if(errFindRole) console.log(errFindRole);

					if(!errFindRole && roleDoc) {
						role = roleDoc.roleName;
						role_permission = roleDoc.rolePermission;
					}

					resolve();
				});
			}));

			promises.push(new Promise(function(resolve){
				User.findOne({_id:req.body.ID},function(errFindUser,userDoc){
					if(errFindUser) console.log(errFindUser);

					if(!errFindUser && userDoc){
						user_permission = userDoc.permission;
					}

					resolve();
				});
			}));
		}

		Promise.all(promises).then(function(){
			if(req.user.permission >= 30){
				if(user_permission >= 10){
					updates = {$set: {fullName: req.body.Name, email: req.body.Email, role:role, permission: role_permission, phone: req.body.Phone}};
				} else updates = {$set: {fullName: req.body.Name, email: req.body.Email, role:role, phone: req.body.Phone}};
			} else {
				updates = {$set: {fullName: req.body.Name, email: req.body.Email, phone: req.body.Phone}};
			}
			User.updateOne({_id: req.body.ID}, updates, {runValidators: true}, function (err, update) {
				if (!err && update) {
					message = "Successfully updated user: " + req.body.Email;

					renderEdit(res,req,user);
				} else if (!update) {
					res.render('edit', {
						error: "User not found!",
						errorCritical: true,
						listLink: listLink,
						user: req.user
					});
				} else {
					error_msg = validationErr(err);

					renderEdit(res,req,user);
				}
			});
		});
	} else {
		res.redirect('/');
	}
});

router.get('/' + deleteLink, function (req, res) {
	if (req.user && req.user.permission >= 30) {
		User.deleteOne({_id: req.query.id}, function (err) {
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

router.get('/' + resetPassLink, function (req, res) {
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
					}, function (err) {
						if (err) {
							console.log(err);
							error = "Unknown error has occurred please try again!";
						} else {
							genFunctions.sendEmail(user.email, password, null, null, null, 'reset-pass');
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
