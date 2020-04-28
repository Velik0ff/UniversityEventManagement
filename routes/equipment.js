/**
 * Author: Lyuboslav Velikov
 * ID: 201186573
 * University of Liverpool
 * This file is used to handle all the routes that are
 * used to manipulate or insert data for the equipment
 * @type {createApplication} is the main route handler (router)
 */

const express = require('express');
const router = express.Router(); // used for the route requests and results

/* Model */
const Equipment = require('../models/EqInventory');
/* End Model */

/* Links of the routes for manipulating the equipment */
const editLink = "edit-equipment";
const viewLink = "view-equipment";
const addLink = "add-equipment";
const deleteLink = "delete-equipment";
const listLink = "list-equipment";
const exportLink = "../export?type=Equipment";
/* End Links of the routes for manipulating the equipment */

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
		if (typeof error.errors.typeName !== "undefined" &&
			error.errors.typeName !== null) {
			local_error_msg = error.errors.typeName.message
		}
		if (typeof error.errors.quantity !== "undefined" &&
			error.errors.quantity !== null) {
			local_error_msg = error.errors.quantity.message
		}
		console.log(local_error_msg);
	} else {
		local_error_msg = "Unknown error has occurred during adding equipment. Please try again later.";
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
 * @param equipment The equipment information gathered from the database
 */
function renderEdit(res,req,equipment){
	// fields that have to be entered
	let fields = [{name: "ID", type: "text", identifier: "id", readonly: true},
		{name: "Name", type: "text", identifier: "typeName"},
		{name: "Quantity", type: "number", identifier: "quantity"}];

	/* Render Template */
	res.render('add-edit', {
		title: 'Editing equipment: ' + equipment.typeName,
		fields: fields,
		error: error_msg,
		message: message,
		item: {
			id: equipment._id,
			typeName: equipment.typeName,
			quantity: equipment.quantity,
		},
		customFieldsValues: equipment.customFields,
		customFields: true,
		submitButtonText:"Save",
		actionLink: '/equipment/' + editLink,
		cancelLink: viewLink + '?id=' + equipment._id,
		user:req.user
	});
	/* End Render Template */

	resetErrorMessage(); // reset messages
}

/**
 * Render the add-edit template with the details for adding
 * @param res The result that has to be shown to the user (the template in our case)
 * @param req The request that has been made by the user
 * @param equipment The equipment information posted
 */
function renderAdd(res,req,equipment){
	// fields that have to be entered
	let fields = [{name: "Name", type: "text", identifier: "typeName"},
		{name: "Quantity", type: "number", identifier: "quantity"}];

	/* Render Template */
	res.render('add-edit', {
		title: 'Add New Equipment',
		fields: fields,
		item: {
			typeName: equipment && error_msg ? equipment.typeName : "",
			quantity: equipment && error_msg ? equipment.quantity : ""
		},
		cancelLink: listLink,
		actionLink: '/equipment/' + addLink,
		customFields: true,
		customFieldsValues: equipment && error_msg ? equipment.customFields : "",
		submitButtonText:"Add",
		error: error_msg,
		message: message,
		user:req.user
	});
	/* End Render Template */

	resetErrorMessage(); // reset messages
}

/**
 * Function to get the custom fields into objects as they have to be added to the database
 * @param req The request that has been made by the user
 * @returns {Array} The resulting set of custom fields
 */
function getCustomFields(req){
	let custom_fields = []; // store the custom fields in this array

	for (const [field_post_key, field_post_value] of Object.entries(req.body)) { // iterate through the request fields that have been entered
		if (req.body.hasOwnProperty(field_post_key)) { // if has the key iterated to
			if (field_post_key !== "name" && field_post_key !== "quantity") {  // if different from the name and quantity property because they are static
				if (field_post_key.includes('fieldName')) { // check if the key includes the "fieldName" string in it
					custom_fields.push({ // add the custom field object to the array
						fieldName: field_post_value,
						fieldValue: ""
					});
				} else if (field_post_key.includes('fieldValue')) { // if the key includes the "fieldValue" string in it
					custom_fields[custom_fields.length - 1]['fieldValue'] = field_post_value; // then the value should be added to the field object
				}
			}
		}
	}

	return custom_fields; // return the array of custom fields
}
/* End Functions */

/**
 * The List route used to list the equipment in the list template
 */
router.get('/'+listLink, function(req, res) {
	if(req.user && req.user.permission >= 20) { // check if the user is either Outreach coordinator or Staff Assistant
		let columns = ["ID", "Name", "Quantity", "Options"]; // columns used as a header

		Equipment.find({}, function (err, equipment) { // find all equipment in the database
			let equipmentList = []; // store the list of equipment here

			/* Structure only the needed information */
			equipment.forEach(function (equip) {
				equipmentList.push({
					id: equip._id,
					name: equip.typeName,
					quantity: equip.quantity,
				});
			});
			/* End Structure only the needed information */

			error_msg = equipmentList.length === 0 ? "No results to show" : ""; // error message to show if there is no equipment found

			/* Render Template */
			res.render('list', {
				title: 'Equipment List',
				filter: 'Equipment',
				list: equipmentList,
				columns: columns,
				editLink: editLink,
				viewLink: viewLink,
				addLink: addLink,
				deleteLink: deleteLink,
				exportLink: exportLink,
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
 * The View route used to view the information of a specific equipment in the view template
 */
router.get('/'+viewLink, function(req, res) {
	if(req.user && req.user.permission >= 20) { // check if the user is either Outreach coordinator or Staff Assistant
		Equipment.findOne({_id: req.query.id}, function (err, equipment) { // fetch the equipment information from the database
			if (!err && equipment) {
				/* Render Template */
				res.render('view', {
					title: 'Viewing equipment: ' + equipment.typeName,
					error: null,
					item: {
						ID: equipment._id,
						Name: equipment.typeName,
						Quantity: equipment.quantity,
						customFields: equipment.customFields
					},
					listLink: listLink,
					deleteLink: req.user.permission >= 30 ? deleteLink + '?id=' + equipment._id : null,
					editLink: editLink + '?id=' + equipment._id,
					user:req.user
				});
				/* End Render Template */

				resetErrorMessage(); // reset messages
			} else { // error while fetching data from database
				console.log(err);

				/* Render Template */
				res.render('view', {
					error: "Equipment not found!",
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
 * The Edit route with a get method used to display the information
 * into the fields that have to be entered in order to edit an equipment
 * in the add-edit template
 */
router.get('/'+editLink, function(req, res) {
	if(req.user && req.user.permission >= 20) { // check if the user is either Outreach coordinator or Staff Assistant
		Equipment.findOne({_id: req.query.id}, function (err, equipment) { // find the equipment information
			if (!err && equipment) {
				renderEdit(res,req,equipment); // render add-edit
			} else { // error while fetching data from database
				/* Render Template */
				res.render('edit', {
					error: "Equipment not found!",
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
	if(req.user && req.user.permission >= 20) { // check if the user is either Outreach coordinator or Staff Assistant
		let equipment = { // structure the posted data into an object
			id:req.body.id,
			typeName:req.body.typeName,
			quantity:req.body.quantity,
			customFields: getCustomFields(req)
		};

		// the updates that have to be saved
		let updates = {$set: {typeName: req.body.typeName, quantity: req.body.quantity, customFields: equipment.customFields}};

		Equipment.updateOne({_id: req.body.id}, updates, {runValidators: true}, function (err) { // update the equipment
			if (!err) {
				message = "Successfully updated equipment: " + req.body.typeName; // message for success

				renderEdit(res,req,equipment); // render add-edit
			} else { // error while updating equipment
				error_msg = validationErr(err); // error message from validation

				renderEdit(res,req,equipment); // render add-edit
			}
		});
	} else { // Insufficient permission level
		res.redirect('/');

		resetErrorMessage(); // reset messages
	}
});

/**
 * The Add route with a get method used to display the fields that have to be populated
 * in order to insert equipment to the database
 */
router.get('/'+addLink, function(req, res) {
	if(req.user && req.user.permission >= 20) { // check if the user is either Outreach coordinator or Staff Assistant
		renderAdd(res,req,null); // render add-edit
	} else {
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
	if(req.user && req.user.permission >= 20) { // check if the user is either Outreach coordinator or Staff Assistant
		let equipment_object = {}; // the temporary equipment object

		/* Assign the equipment fields from the posted fields */
		equipment_object['typeName'] = req.body.typeName;
		equipment_object['quantity'] = req.body.quantity;
		equipment_object['customFields'] = getCustomFields(req);
		/* End Assign the equipment fields from the posted fields */

		let new_equipment = new Equipment(equipment_object); // create new equipment object to store in the database

		/* Insert new equipment */
		new_equipment.save(function (error) { // insert into the database
			if (!error) {
				message = "Successfully added new equipment: " + req.body.typeName; // success message
			} else { // error while inserting data
				error_msg = validationErr(error);
			}

			renderAdd(res,req,equipment_object); // render add-edit
		});
		/* End Insert new equipment */
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
	if(req.user && req.user.permission >= 30) { // check if the user is Outreach coordinator
		Equipment.deleteOne({_id: req.query.id}, function (err) { // delete the equipment from the database
			if (!err) {
				/* Render Template */
				res.render('view', {
					deleteMsg: "Successfully deleted equipment!",
					listLink: listLink,
					user:req.user
				});
			} else {
				console.log(err); // console log the error
				/* Render Template */
				res.render('view', {
					error: "Equipment not found!",
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
