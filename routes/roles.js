/**
 * Author: Lyuboslav Velikov
 * ID: 201186573
 * University of Liverpool
 * This file is used to handle all the routes that are
 * used to manipulate or insert data for the roles
 * @type {createApplication} is the main route handler (router)
 */

const express = require('express');
const router = express.Router(); // used for the route requests and results

/* Model */
const Role = require('../models/Role');
/* End Model */

/* Links of the routes for manipulating the roles */
const editLink = "edit-role";
const viewLink = "view-role";
const addLink = "add-role";
const deleteLink = "delete-role";
const listLink = "list-roles";
/* End Links of the routes for manipulating the roles */

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

/**
 * Reset the feedback messages
 */
function resetErrorMessage(){
	error_msg = null;
	message = null;
}

/**
 * Render the add-edit template with the details for editing
 * @param res The result that has to be shown to the user (the template in our case)
 * @param req The request that has been made by the user
 * @param role The role information gathered from the database
 */
function renderEdit(res,req,role){
	// fields that have to be entered
	let fields = [{name: "ID", type: "text", identifier: "id", readonly: true},
		{name: "Role Name", type: "text", identifier: "roleName"},
		{name: "Permission Level", type: "number", identifier: "rolePermission"}];

	/* Render Template */
	res.render('add-edit', {
		title: 'Editing role: ' + role.roleName,
		fields: fields,
		error: error_msg,
		message: message,
		item: {
			id: role._id,
			roleName: role.roleName,
			rolePermission: role.rolePermission
		},
		customFields: false,
		submitButtonText:"Save",
		actionLink: '/roles/' + editLink,
		cancelLink: viewLink + '?id=' + role._id,
		user:req.user
	});
	/* End Render Template */

	resetErrorMessage(); // reset messages
}

/**
 * Render the add-edit template with the details for adding
 * @param res The result that has to be shown to the user (the template in our case)
 * @param req The request that has been made by the user
 * @param role The role information posted
 */
function renderAdd(res,req,role){
	// fields that have to be entered
	let fields = [{name: "Role Name", type: "text", identifier: "roleName"},
		{name: "Permission Level", type: "number", identifier: "rolePermission"}];

	/* Render Template */
	res.render('add-edit', {
		title: 'Add New Role',
		fields: fields,
		item: {
			roleName: role ? role.roleName : "",
			rolePermission: role ? role.rolePermission : ""
		},
		cancelLink: listLink,
		actionLink: '/roles/' + addLink,
		submitButtonText:"Add",
		customFields: false,
		error: error_msg,
		message: message,
		user:req.user
	});
	/* End Render Template */

	resetErrorMessage(); // reset messages
}
/* End Functions */

/**
 * The List route used to list the roles in the list template
 */
router.get('/'+listLink, function(req, res) {
	if(req.user && req.user.permission >= 30) { // check if the user is an Outreach coordinator
		let columns = ["ID", "Name", "Permission Level", "Options"]; // columns used as a header

		Role.find({}, function (err, roles) { // fetch all roles from the database
			let roleList = []; // store the list of roles here

			/* Structure only the needed information */
			roles.forEach(function (role) {
				roleList.push({
					id: role._id,
					name: role.roleName,
					rolePermission: role.rolePermission,
				});
			});
			/* End Structure only the needed information */

			error_msg = roles.length === 0 ? "No results to show" : ""; // error message to show if there are no roles found

			/* Render Template */
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
			/* End Render Template */

			resetErrorMessage(); // reset messages
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

/**
 * The View route used to view the information of a specific role in the view template
 */
router.get('/'+viewLink, function(req, res) {
	if(req.user && req.user.permission >= 30) { // check if the user is an Outreach coordinator
		Role.findOne({_id: req.query.id}, function (err, role) { // fetch the equipment information from the database
			if (!err && role) {
				/* Render Template */
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
				/* End Render Template */
			} else { // error while fetching data from database
				console.log(err);

				/* Render Template */
				res.render('view', {
					error: "Role not found!",
					listLink: listLink,
					user:req.user
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
 * The Edit route with a get method used to display the information
 * into the fields that have to be entered in order to edit a role
 * in the add-edit template
 */
router.get('/'+editLink, function(req, res) {
	if(req.user && req.user.permission >= 30) { // check if the user is an Outreach coordinator
		Role.findOne({_id: req.query.id}, function (err, role) { // fetch the role information from the database
			if (!err && role) {
				role['id'] = role._id;
				renderEdit(res,req,role); // render add-edit
			} else { // error while fetching data from database
				console.log(err);

				/* Render Template */
				res.render('edit', {
					error: "Role not found!",
					listLink: listLink,
					user:req.user
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
router.post('/'+editLink, function(req, res) {
	if(req.user && req.user.permission >= 30) { // check if the user is an Outreach coordinator
		let role = { // structure the posted data into an object
			id:req.body.id,
			roleName:req.body.roleName,
			rolePermission:req.body.rolePermission
		};

		// the updates that have to be saved
		let updates = {$set: {roleName: req.body.roleName, rolePermission: req.body.rolePermission}};

		Role.updateOne({_id: req.body.id}, updates, {runValidators: true}, function (err) { // update the role
			if (!err) {
				message = "Successfully updated role: " + req.body.roleName; // message for success

				renderEdit(res,req,role); // render add-edit
			} else { // error while updating role
				error_msg = validationErr(err);

				renderEdit(res,req,role); // render add-edit
			}
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

/**
 * The Add route with a get method used to display the fields that have to be populated
 * in order to insert role to the database
 */
router.get('/'+addLink, function(req, res) {
	if(req.user && req.user.permission >= 30) { // check if the user is an Outreach coordinator
		renderAdd(res,req, null); // render add-edit
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
router.post('/'+addLink, function(req, res) {
	if(req.user && req.user.permission >= 30) { // check if the user is an Outreach coordinator
		let role_object = {}; // the temporary event type object

		/* Assign the role fields from the posted fields */
		role_object['roleName'] = req.body.roleName;
		role_object['rolePermission'] = req.body.rolePermission;
		/* End Assign the role fields from the posted fields */

		let new_role = new Role(role_object);

		/* Insert new role */
		new_role.save(function (error) { // insert into the database
			if (!error) {
				message = "Successfully added new role: " + req.body.roleName; // success message
			} else { // error while inserting data
				error_msg = validationErr(error);
			}

			renderAdd(res,req,role_object); // render add-edit
		});
		/* End Insert new role */
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

/**
 * The Delete route is used to delete an entity from the database
 * renders the view template
 */
router.get('/'+deleteLink, function(req, res) {
	if(req.user && req.user.permission >= 30) { // check if the user is an Outreach coordinator
		Role.deleteOne({_id: req.query.id}, function (err) { // delete role from the database
			if (!err) {
				/* Render Template */
				res.render('view', {
					deleteMsg: "Successfully deleted role!",
					listLink: listLink,
					user:req.user
				});
				/* End Render Template */
			} else { // error while deleting role
				console.log(err); // console log the error
				/* Render Template */
				res.render('view', {
					error: "Role not found!",
					listLink: listLink,
					user:req.user
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

module.exports = router; // export the route
