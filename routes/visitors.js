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

let error_msg = null;
let message = null;
let fields = [{name: "Lead Teacher Full Name", type: "text", identifier: "name"},
	{name: "Institution Name", type: "text", identifier: "institutionName"},
	{name: "Contact Email", type: "email", identifier: "email"},
	{name: "Contact Phone", type: "phone", identifier: "phone"},
	{name: "Group Size", type: "number", identifier: "groupSize"}];

/* Functions */
function validationErr(error) {
	let local_error_msg = null;

	if (error.name === "ValidationError") { // check if the error is from the validator
		if (typeof error.errors.leadTeacherName !== "undefined" &&
			error.errors.leadTeacherName !== null) {
			local_error_msg = error.errors.leadTeacherName.message
		}
		if (typeof error.errors.contactEmail !== "undefined" &&
			error.errors.contactEmail !== null) {
			local_error_msg = error.errors.contactEmail.message
		}
		console.log(local_error_msg);
	} else {
		if (error.code === 11000) { // duplicate entry
			local_error_msg = "Email already exists.";
		} else { // unknown error
			local_error_msg = "Unknown error has occurred during adding of the user. Please try again later.";
			console.log(local_error_msg);
		}
	}

	return local_error_msg;
}

function resetErrorMessage(){
	error_msg = null;
	message = null;
}

function renderAdd(res,req){
	res.render('add', {
		title: 'Add New Visitor',
		item: {
			"Lead Teacher Full Name": req.body["Lead Teacher Full Name"],
			"Institution Name": req.body["Institution Name"],
			"Contact Email": req.body["Contact Email"],
			"Contact Phone": req.body["Contact Phone"],
			"Group Size": req.body["Group Size"],
		},
		fields: fields,
		cancelLink: listLink,
		addLink: '/visitors/' + addLink,
		customFields: false,
		error: error_msg,
		message: message,
		user: req.user
	});

	resetErrorMessage();
}

function renderEdit(res,req,user){
	res.render('edit', {
		title: 'Editing visitor: ' + user.leadTeacherName,
		error: error_msg,
		message: message,
		item: {
			ID: req.user._id,
			"Lead Teacher Full Name": user.leadTeacherName,
			"Institution Name": user.institutionName,
			"Contact Email": user.contactEmail,
			"Contact Phone": user.contactPhone,
			"Group Size": user.groupSize,
		},
		editLink: '/visitors/' + editLink,
		cancelLink: req.user.permission >= 10 ? viewLink + '?id=' + user._id : '../events/participate-events-list',
		user: req.user
	});

	resetErrorMessage();
}
/* End Functions */

router.get('/' + listLink, function (req, res) {
	if (req.user && req.user.permission >= 10) {
		let columns = ["ID", "Institution Name", "Lead Teacher", "Email", "Options"];
		let visitorInstitutions = [];

		User.find({}, null, {sort: '-leadTeacherName'}, function (err, users) {
			let userList = [];

			users.forEach(function (user) {
				userList.push({
					id: user._id,
					institutionName: user.institutionName,
					name: user.leadTeacherName,
					email: user.contactEmail
				});

				if(!visitorInstitutions.includes(user.institutionName)){
					visitorInstitutions.push(user.institutionName);
				}
			});

			error_msg = userList.length === 0 ? "No results to show" : ""

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
				visitorInstitutions: visitorInstitutions,
				error: error_msg,
				user: req.user
			});

			resetErrorMessage();
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/' + viewLink, function (req, res) {
	if (req.user && req.user.permission >= 10) {
		/* Logic to get info from database */
		User.findOne({_id: req.query.id}, function (err, user) {
			if (!err && user) {
				res.render('view', {
					title: 'Viewing staff member: ' + user.leadTeacherName,
					error: error_msg,
					item: {
						ID: user._id,
						"Intitution Name": user.institutionName,
						"Lead Teacher": user.leadTeacherName,
						Email: user.contactEmail,
						"Group Size": user.groupSize,
						"Attending Events": user.attendingEvents,
						"Attended Events": user.attendedEvents
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

			resetErrorMessage();
		});
		/* End Logic to get info from database */
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/' + addLink, function (req, res) {
	if (req.user && req.user.permission >= 20) {
		renderAdd(res,req);
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.post('/' + addLink, function (req, res) {
	if (req.user && req.user.permission >= 20) {
		let password_to_insert = short().new();

		let new_user = new User({ // new user object to be inserted
			leadTeacherName: req.body['Lead Teacher Full Name'],
			institutionName: req.body['Institution Name'],
			contactEmail: req.body['Contact Email'],
			password: password_to_insert,
			contactPhone: req.body['Contact Phone'],
			groupSize: req.body['Group Size'],
			permission: -2,
		});

		/* Insert new user */
		new_user.save(function (error) {
			if (!error) {
				message = "Successfully added new visitor with email: " + req.body['Contact Email'];
				genFunctions.sendEmail(req.body['Contact Email'], password_to_insert, null, null, null, "visitor").then().catch();
			} else {
				error_msg = validationErr(error);
			}

			renderAdd(res,req);
		});
		/* End Insert new user */
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/' + editLink, function (req, res) {
	if ((req.user && req.user.permission >= 20) || (req.user && req.user.permission === 1 && req.user._id === req.query.id)) {
		User.findOne({_id: req.query.id}, function (err, user) {
			if (!err && user) {
				renderEdit(res,req,user);
			} else {
				res.render('edit', {
					error: "Visitor not found!",
					listLink: listLink,
					user: req.user
				});

				resetErrorMessage();
			}
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.post('/' + editLink, function (req, res) {
	if ((req.user && req.user.permission >= 20) || (req.user && req.user.permission === 1 && req.user._id === req.query.id)) {
		let user = {
			_id: req.body.ID,
			leadTeacherName: req.body["Lead Teacher Full Name"],
			institutionName: req.body["Institution Name"],
			contactEmail: req.body["Contact Email"],
			contactPhone: req.body["Contact Phone"],
			groupSize: req.body["Group Size"]
		};
		let updates = {$set: {
				leadTeacherName: req.body["Lead Teacher Full Name"],
				institutionName: req.body["Institution Name"],
				contactEmail: req.body["Contact Email"],
				contactPhone: req.body["Contact Phone"],
				groupSize: req.body["Group Size"]
			}};

		User.updateOne({_id: req.body.ID}, updates, {runValidators: true}, function (err, update) {
			if (!err && update) {
				message = "Successfully updated visitor: " + req.body["Lead Teacher Full Name"];

				renderEdit(res,req,user);
			} else if (!update) {
				res.render('edit', {
					error: "User not found!",
					errorCritical: true,
					listLink: listLink,
					user: req.user
				});

				resetErrorMessage();
			} else {
				error_msg = validationErr(err);

				renderEdit(res,req,user);
			}
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/' + deleteLink, function (req, res) {
	if (req.user && req.user.permission >= 30) {
		User.deleteOne({_id: req.query.id}, function (err) {
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

			resetErrorMessage();
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/' + resetPassLink, function (req, res) {
	if (req.user && req.user.permission >= 20) {

		function renderView(){
			res.render('view', {
				resetMsg: message,
				error: error_msg,
				listLink: listLink,
				user: req.user
			});

			resetErrorMessage();
		}

		if (req.query.id) {

			User.findOne({_id: req.query.id}, function (errFind, user) {
				if (!errFind) {
					let password = short().new();

					User.updateOne({_id: req.query.id}, {
						$set: {
							permission: -2,
							password: user.hashPassword(password)
						}
					}, function (err) {
						if (err) {
							console.log(err);
							error_msg = "Unknown error has occurred please try again!";
						} else {
							genFunctions.sendEmail(user.contactEmail, password, null, null, null, 'reset-pass').then().catch();
							message = "Successfully reset password of the user.";
						}

						renderView();
					});
				} else {
					console.log(errFind);

					error_msg = "Unknown error has occurred please try again!";

					renderView();
				}
			});
		} else {
			console.log('No id is posted for reset password of the user.');

			error_msg = "Unknown error has occurred please try again!";

			renderView();
		}
	} else {
		res.redirect('/welcome');

		resetErrorMessage();
	}
});

module.exports = router;
