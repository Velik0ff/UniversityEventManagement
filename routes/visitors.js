const express = require('express');
const router = express.Router();
const short = require('short-uuid');
const genFunctions = require('../functions/generalFunctions');

/* Model */
const User = require('../models/visitor_user');
/* End Model */

/* Links */
const viewLink = "view-visitor";
const editLink = "edit-visitor";
const addLink = "add-visitor";
const deleteLink = "delete-visitor";
const listLink = "list-visitors";
const resetPassLink = "reset-password";
const exportLink = "../export?type=Staff";
/* End Links */

/* Functions */
function validationErr(error) {
	var error_msg = "";

	if (error.name === "ValidationError") { // check if the error is from the validator
		if (typeof error.errors.leadTeacherName !== "undefined" &&
			error.errors.leadTeacherName !== null) {
			error_msg = error.errors.leadTeacherName.message
		}
		if (typeof error.errors.contactEmail !== "undefined" &&
			error.errors.contactEmail !== null) {
			error_msg = error.errors.contactEmail.message
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
		let columns = ["ID", "Institution Name", "Lead Teacher", "Email", "Options"];
		var error = "";

		User.find({}, null, {sort: '-leadTeacherName'}, function (err, users) {
			var userList = [];

			users.forEach(function (user) {
				userList.push({
					id: user._id,
					name: user.leadTeacherName,
					institutionName: user.institutionName,
					email: user.contactEmail
				});
			});

			error = userList.length === 0 ? "No results to show" : ""

			res.render('list', {
				title: 'Visitor List',
				list: userList,
				filter: "Visitors",
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
					title: 'Viewing staff member: ' + user.leadTeacherName,
					error: null,
					// rows: rows,
					item: {
						ID: user._id,
						"Intitution Name": user.institutionName,
						"Lead Teacher": user.leadTeacherName,
						Email: user.contactEmail,
						"Group Size": user.groupSize
					},
					listLink: listLink,
					deleteLink: deleteLink + '?id=' + user._id,
					editLink: editLink + '?id=' + user._id,
					user: req.user
				});
			} else {
				res.render('view', {
					error: "User not found!",
					listLink: listLink
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
		let fields = [{name: "Lead Teacher Full Name", type: "text", identifier: "name"},
			{name: "Institution Name", type: "text", identifier: "institutionName"},
			{name: "Contact Email", type: "email", identifier: "email"},
			{name: "Contact Phone", type: "phone", identifier: "phone"},
			{name: "Group Size", type: "number", identifier: "groupSize"},
			{name: "Expiry Date", type: "date", identifier: "expiryDate"}];

		res.render('add', {
			title: 'Add New Visitor',
			fields: fields,
			cancelLink: listLink,
			addLink: '/visitors/' + addLink,
			customFields: false,
			error: null,
			message: null
		});
	} else {
		res.redirect('/');
	}
});

router.get('/' + editLink, function (req, res, next) {
	if ((req.user && req.user.permission === 0) || (req.user && req.user.permission === 1 && req.user._id === req.query.id)) {
		User.findOne({_id: req.query.id}, function (err, user) {
			if (!err && user) {
				res.render('edit', {
					title: 'Editing visitor: ' + user.leadTeacherName,
					error: null,
					item: {
						ID: req.query.id,
						"Lead Teacher Full Name": user.leadTeacherName,
						"Institution Name": user.institutionName,
						"Contact Email": user.contactEmail,
						"Contact Phone": user.contactPhone,
						"Group Size": user.groupSize,
						"Expiry Date": user.expiryDate
					},
					editLink: '/visitor/' + editLink,
					cancelLink: req.user.permission === 0 ? viewLink + '?id=' + user._id : '../events/participate-events-list',
					user: req.user
				});
			} else {
				res.render('edit', {
					error: "Visitor not found!",
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
					deleteMsg: "Successfully deleted visitor!",
					listLink: listLink,
					user: req.user
				});
			} else {
				console.log(err); // console log the error
				res.render('view', {
					error: "Visitor not found!",
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
	if ((req.user && req.user.permission === 0) || (req.user && req.user.permission === 1 && req.user._id === req.query.id)) {
		let updates = {
			$set: {
				leadTeacherName: req.body["Lead Teacher Full Name"],
				institutionName: req.body["Institution Name"],
				contactEmail: req.body["Contact Email"],
				contactPhone: req.body["Contact Phone"],
				groupSize: req.body["Group Size"],
				expiryDate: req.body["Expiry Date"]
			}
		};
		let message = null;
		let error = null;

		User.updateOne({_id: req.body.ID}, updates, {runValidators: true}, function (err, update) {
			if (!err && update) {
				message = "Successfully updated visitor: " + req.body["Lead Teacher Full Name"];

			} else if (!update) {
				res.render('edit', {
					error: "User not found!",
					errorCritical: true,
					listLink: listLink,
					user: req.user
				});
			} else {
				error = validationErr(err);
			}

			res.render('edit', {
				title: 'Editing visitor: ' + req.body["Lead Teacher Full Name"],
				error: error,
				errorCritical: false,
				message: message,
				item: {
					ID: req.body.ID,
					"Lead Teacher Full Name": req.body['Lead Teacher Full Name'],
					"Institution Name": req.body['Institution Name'],
					"Contact Email": req.body['Contact Email'],
					"Contact Phone": req.body['Contact Phone'],
					"Group Size": req.body['Group Size'],
					"Expiry Date": req.body['Expiry Date']
				},
				editLink: '/visitor/' + editLink,
				cancelLink: req.user.permission === 0 ? viewLink + '?id=' + req.body.ID : '../events/participate-events-list',
				user: req.user
			});
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
		let fields = [{name: "Lead Teacher Full Name", type: "text", identifier: "name"},
			{name: "Institution Name", type: "text", identifier: "institutionName"},
			{name: "Contact Email", type: "email", identifier: "email"},
			{name: "Contact Phone", type: "phone", identifier: "phone"},
			{name: "Group Size", type: "number", identifier: "groupSize"},
			{name: "Expiry Date", type: "date", identifier: "expiryDate"}];

		let new_user = new User({ // new user object to be inserted
			leadTeacherName: req.body['Lead Teacher Full Name'],
			institutionName: req.body['Institution Name'],
			contactEmail: req.body['Contact Email'],
			password: password_to_insert,
			contactPhone: req.body['Contact Phone'],
			groupSize: req.body['Group Size'],
			permission: -2,
			expiryDate: req.body['Expiry Date']
		});

		function renderScreen() {
			res.render('add', {
				title: 'Add New Visitor',
				// rows: rows,
				fields: fields,
				cancelLink: listLink,
				addLink: '/visitors/' + addLink,
				customFields: false,
				error: error_msg,
				message: message,
				user: req.user
			});
		}

		/* Insert new user */
		new_user.save(function (error, userDoc) {
			if (!error) {
				message = "Successfully added new visitor with email: " + req.body['Contact Email'];
				genFunctions.sendEmail(req.body['Contact Email'], password_to_insert, null, null, null, "visitor");
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
							permission: -2,
							password: user.hashPassword(password)
						}
					}, function (err, userDoc) {
						if (err) {
							console.log(err);
							error = "Unknown error has occurred please try again!";
						} else {
							genFunctions.sendEmail(user.contactEmail, password, null, null, null, 'reset-pass');
							message = "Successfully reset password of the user.";
						}

						renderView(message,error);
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
