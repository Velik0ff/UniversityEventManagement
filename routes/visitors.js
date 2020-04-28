/**
 * Author: Lyuboslav Velikov
 * ID: 201186573
 * University of Liverpool
 * This file is used to handle all the routes that are
 * used to manipulate or insert data for the visitors
 * @type {createApplication} is the main route handler (router)
 */

const express = require('express');
const router = express.Router(); // used for the route requests and results
const short = require('short-uuid'); // generate unique ids
const genFunctions = require('../functions/generalFunctions'); // general functions used to manipulate and fetch data

/* Model */
const User = require('../models/visitor_user');
/* End Model */

/* Links of the routes for manipulating the visitors */
const viewLink = "view-visitor";
const editLink = "edit-visitor";
const addLink = "add-visitor";
const deleteLink = "delete-visitor";
const listLink = "list-visitors";
const resetPassLink = "reset-password";
const exportLink = "../export?type=Staff";
/* End Links of the routes for manipulating the visitors */

/* Feedback Messages */
let error_msg = null;
let message = null;
/* End Feedback Messages */

/* Functions */
/**
 * Function for structuring the data returned by MongoDB validation
 * @param error Passing the error so it can be checked what is it actually
 * @returns {string} The error that has to be printed
 */
function validationErr(error) {
	let local_error_msg = "";

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

/**
 * Reset the feedback messages
 */
function resetErrorMessage(){
	error_msg = null;
	message = null;
}

/**
 * Render the add-edit template with the details for adding
 * @param res The result that has to be shown to the user (the template in our case)
 * @param req The request that has been made by the user
 * @param user The staff member information posted
 */
function renderAdd(res,req,user){
	// fields that have to be entered
	let fields = [{name: "Lead Teacher Full Name", type: "text", identifier: "leadTeacherName"},
		{name: "Institution Name", type: "text", identifier: "institutionName"},
		{name: "Contact Email", type: "email", identifier: "email"},
		{name: "Contact Phone", type: "phone", identifier: "phone"},
		{name: "Group Size", type: "number", identifier: "groupSize"}];

	/* Render Template */
	res.render('add-edit', {
		title: 'Add New Visitor',
		fields: fields,
		error: error_msg,
		message: message,
		item: {
			leadTeacherName: user && error_msg ? user.leadTeacherName : "",
			institutionName: user && error_msg ? user.institutionName : "",
			contactEmail: user && error_msg ? user.contactEmail : "",
			contactPhone: user && error_msg ? user.contactPhone : "",
			groupSize: user && error_msg ? user.groupSize : "",
		},
		cancelLink: listLink,
		submitButtonText: "Add",
		actionLink: '/visitors/' + addLink,
		customFields: false,
		user: req.user
	});
	/* End Render Template */

	resetErrorMessage(); // reset messages
}

/**
 * Render the add-edit template with the details for editing
 * @param res The result that has to be shown to the user (the template in our case)
 * @param req The request that has been made by the user
 * @param user The staff member information gathered from the database
 */
function renderEdit(res,req,user){
	// fields that have to be entered
	let fields = [{name: "ID", type: "text", identifier: "id", readonly: true},
		{name: "Lead Teacher Full Name", type: "text", identifier: "leadTeacherName"},
		{name: "Institution Name", type: "text", identifier: "institutionName"},
		{name: "Contact Email", type: "email", identifier: "email"},
		{name: "Contact Phone", type: "phone", identifier: "phone"},
		{name: "Group Size", type: "number", identifier: "groupSize"}];

	res.render('add-edit', {
		title: 'Editing visitor: ' + user.leadTeacherName,
		fields: fields,
		error: error_msg,
		message: message,
		item: {
			id: user._id,
			leadTeacherName: user.leadTeacherName,
			institutionName: user.institutionName,
			contactEmail: user.contactEmail,
			contactPhone: user.contactPhone,
			groupSize: user.groupSize
		},
		submitButtonText: "Save",
		actionLink: '/visitors/' + editLink,
		cancelLink: req.user.permission >= 10 ? viewLink + '?id=' + user._id : '../events/participate-events-list',
		user: req.user
	});

	resetErrorMessage(); // reset messages
}
/* End Functions */

/**
 * The List route used to list the staff members in the list template
 */
router.get('/' + listLink, function (req, res) {
	if (req.user && req.user.permission >= 10) { // check if the user is a staff member
		let columns = ["ID", "Institution Name", "Lead Teacher", "Email", "Options"]; // columns used as a header
		let visitorInstitutions = []; // store the institutions here

		User.find({}, function (err, users) { // fetch all visitors from the database
			let userList = []; // store the visitors here

			/* Structure only the needed information */
			users.forEach(function (user) {
				userList.push({
					id: user._id,
					institutionName: user.institutionName,
					name: user.leadTeacherName,
					email: user.contactEmail
				});

				// store the institution names
				if(!visitorInstitutions.includes(user.institutionName)){
					visitorInstitutions.push(user.institutionName);
				}
			});
			/* End Structure only the needed information */

			error_msg = userList.length === 0 ? "No results to show" : ""; // error message to show if there are no visitors found

			/* Render Template */
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
			/* End Render Template */

			resetErrorMessage(); // reset messages
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

/**
 * The View route used to view the information of a specific visitor in the view template
 */
router.get('/' + viewLink, function (req, res) {
	if (req.user && req.user.permission >= 10) { // check if the user is a staff member
		User.findOne({_id: req.query.id}, function (err, user) { // fetch the visitor information from the database
			if (!err && user) {
				/* Render Template */
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
				/* End Render Template */
			} else { // error while fetching data from the database or visitor not found
				/* Render Template */
				res.render('view', {
					error: "User not found!",
					listLink: listLink
				});
				/* End Render Template */
			}

			resetErrorMessage(); // reset messages
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

/**
 * The Add route with a get method used to display the fields that have to be populated
 * in order to insert visitor to the database
 */
router.get('/' + addLink, function (req, res) {
	if (req.user && req.user.permission >= 20) { // check if the user is an Outreach coordinator or a Staff Assistant
		renderAdd(res,req,null); // render add-edit
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

/**
 * The Add route with a post method used to insert the populated fields into the database
 * and populate the fields again into the template just in case any error happens
 * and render the add-edit template again
 */
router.post('/' + addLink, function (req, res) {
	if (req.user && req.user.permission >= 20) { // check if the user is an Outreach coordinator or a Staff Assistant
		let password_to_insert = short().new(); // the password of the user generated by the system

		/* Assign the visitor fields from the posted fields */
		// Initial permissions of the visitors are -2 until they change their initial password
		let user_object = { // the temporary visitor object
			leadTeacherName: req.body.leadTeacherName,
			institutionName: req.body.institutionName,
			contactEmail: req.body.contactEmail,
			password: password_to_insert,
			contactPhone: req.body.contactPhone,
			groupSize: req.body.groupSize,
			permission: -2,
		};
		/* End Assign the visitor fields from the posted fields */

		let new_user = new User(user_object); // new visitor object to be inserted

		/* Insert new user */
		new_user.save(function (error) {
			if (!error) {
				message = "Successfully added new visitor with email: " + req.body.contactEmail; // success message

				genFunctions.sendEmail(req.body.contactEmail, password_to_insert, null, null, null, "visitor").then().catch(); // send email notification with the user password
			} else { // error while inserting data
				error_msg = validationErr(error); // validation error
			}

			renderAdd(res,req,user_object); // render add-edit
		});
		/* End Insert new user */
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

/**
 * The Edit route with a get method used to display the information
 * into the fields that have to be entered in order to edit a visitor
 * in the add-edit template
 */
router.get('/' + editLink, function (req, res) {
	if ((req.user && req.user.permission >= 20) || (req.user && req.user.permission === 1 && req.user._id.toString() === req.query.id)) { // check if the user is an Outreach coordinator or a Staff Assistant or this is the users profile
		User.findOne({_id: req.query.id}, function (err, user) { // fetch user information from the database
			if (!err && user) {
				renderEdit(res,req,user); // render add-edit
			} else { // error while fetching information or visitor not found
				/* Render Template */
				res.render('edit', {
					error: "Visitor not found!",
					listLink: listLink,
					user: req.user
				});
				/* End Render Template */

				resetErrorMessage(); // reset messages
			}
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

/**
 * The Edit route with a post method used to update the information
 * from the database and populate the fields if another edit will be required
 * in the add-edit template
 */
router.post('/' + editLink, function (req, res) {
	// check if the user is an Outreach coordinator or this is his or hers own profile
	if ((req.user && req.user.permission >= 30) || (req.user && req.user.permission === 1 && req.user._id.toString() === req.body.id)) { // check if the user is an Outreach coordinator or a Staff Assistant or this is the users profile
		/* Assign the visitor fields from the posted fields */
		let user = {
			_id: req.body.id,
			leadTeacherName: req.body.leadTeacherName,
			institutionName: req.body.institutionName,
			contactEmail: req.body.contactEmail,
			contactPhone: req.body.contactPhone,
			groupSize: req.body.groupSize
		};
		/* End Assign the visitor fields from the posted fields */

		let updates = {$set: { // store the updates that have to be done here
				leadTeacherName: req.body.leadTeacherName,
				institutionName: req.body.institutionName,
				contactEmail: req.body.contactEmail,
				contactPhone: req.body.contactPhone,
				groupSize: req.body.groupSize
			}};

		User.updateOne({_id: req.body.ID}, updates, {runValidators: true}, function (err, update) { // update the visitor
			if (!err && update) {
				message = "Successfully updated visitor: " + req.body.leadTeacherName; // message for success

				renderEdit(res,req,user); // render add-edit
			} else { // error while updating visitor
				error_msg = validationErr(err); // error message from validation

				renderEdit(res,req,user); // render add-edit
			}
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

/**
 * The Delete route is used to delete a visitor from the database
 * renders the view template
 */
router.get('/' + deleteLink, function (req, res) {
	if (req.user && req.user.permission >= 30) { // check if the user is an Outreach coordinator
		User.deleteOne({_id: req.query.id}, function (err) { // delete visitor from the database
			if (!err) {
				/* Render Template */
				res.render('view', {
					deleteMsg: "Successfully deleted visitor!",
					listLink: listLink,
					user: req.user
				});
				/* End Render Template */
			} else { // error while deleting visitor from database
				console.log(err); // console log the error
				/* Render Template */
				res.render('view', {
					error: "Visitor not found!",
					listLink: listLink,
					user: req.user
				});
				/* End Render Template */
			}

			resetErrorMessage(); // reset messages
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

/**
 * The Reset Password route is used to generate and send a new password to the chosen visitor
 * renders the view template
 */
router.get('/' + resetPassLink, function (req, res) {
	if (req.user && req.user.permission >= 20) { // check if the user is an Outreach coordinator

		/**
		 * This function is used to render the view template with
		 * the appropriate message depending on the result
		 */
		function renderView(){
			/* Render Template */
			res.render('view', {
				resetMsg: message,
				error: error_msg,
				listLink: listLink,
				user: req.user
			});
			/* End Render Template */

			resetErrorMessage(); // reset messages
		}

		if (req.query.id) { // check if there is a visitor selected
			User.findOne({_id: req.query.id}, function (errFind, user) { // fetch the visitor information from the database
				if (!errFind) {
					let password = short().new(); // generate new random password

					// the permission of the user will be set to -2, because we are giving him or her a new random generated password
					User.updateOne({_id: req.query.id}, {
						$set: {
							permission: -2,
							password: user.hashPassword(password) // hash the password using SHA256
						}
					}, function (err) {
						if (err) { // error while updating visitor
							console.log(err);

							error_msg = "Unknown error has occurred please try again!";
						} else { // no errors send new password to user via email
							genFunctions.sendEmail(user.contactEmail, password, null, null, null, 'reset-pass').then().catch();

							message = "Successfully reset password of the user.";
						}

						renderView(); // render view template
					});
				} else { // error while fetching visitor information from the database
					console.log(errFind);

					error_msg = "Unknown error has occurred please try again!";

					renderView(); // render view template
				}
			});
		} else { // No visitor has been chosen
			console.log('No id is posted for reset password of the user.');

			error_msg = "Unknown error has occurred please try again!";

			renderView(); // render view template
		}
	} else { // Insufficient permission level
		res.redirect('/welcome');

		resetErrorMessage(); // reset messages
	}
});

module.exports = router; // export the route
