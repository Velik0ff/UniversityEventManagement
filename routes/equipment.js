const express = require('express');
const router = express.Router();

/* Model */
const Equipment = require('../models/EqInventory');
/* End Model */

const editLink = "edit-equipment";
const viewLink = "view-equipment";
const addLink = "add-equipment";
const deleteLink = "delete-equipment";
const listLink = "list-equipment";
const exportLink = "../export?type=Equipment";

let error_msg = null;
let message = null;

/* Functions */
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

function resetErrorMessage(){
	error_msg = null;
	message = null;
}

function renderAdd(res,req,custom_fields){
	let fields = [{name: "Name", type: "text", identifier: "typeName"},
		{name: "Quantity", type: "number", identifier: "quantity"}];

	res.render('add-edit', {
		title: 'Add New Equipment',
		fields: fields,
		item: {
			typeName: req.body.typeName,
			quantity: req.body.quantity,
		},
		cancelLink: listLink,
		actionLink: '/equipment/' + addLink,
		customFields: true,
		customFieldsValues: custom_fields,
		submitButtonText:"Add",
		error: error_msg,
		message: message,
		user:req.user
	});

	resetErrorMessage();
}

function renderEdit(res,req,equipment){
	let fields = [{name: "ID", type: "text", identifier: "id", readonly: true},
		{name: "Name", type: "text", identifier: "typeName"},
		{name: "Quantity", type: "number", identifier: "quantity"}];

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

	resetErrorMessage();
}

function getCustomFields(req){
	let custom_fields = [];

	for (const [field_post_key, field_post_value] of Object.entries(req.body)) {
		if (req.body.hasOwnProperty(field_post_key)) {
			if (field_post_key !== "name" && field_post_key !== "quantity") {
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

	return custom_fields;
}
/* End Functions */

router.get('/'+listLink, function(req, res) {
	if(req.user && req.user.permission >= 20) {
		let columns = ["ID", "Name", "Quantity", "Options"];

		Equipment.find({}, function (err, equipment) {
			let equipmentList = [];

			equipment.forEach(function (equip) {
				equipmentList.push({
					id: equip._id,
					name: equip.typeName,
					quantity: equip.quantity,
				});
			});

			error_msg = equipmentList.length === 0 ? "No results to show" : ""

			res.render('list', {
				title: 'Equipment List',
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
		Equipment.findOne({_id: req.query.id}, function (err, equipment) {
			if (!err && equipment) {
				res.render('view', {
					title: 'Viewing equipment: ' + equipment.typeName,
					error: null,
					// rows: rows,
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

				resetErrorMessage();
			} else {
				res.render('view', {
					error: "Equipment not found!",
					listLink: listLink,
					user:req.user
				});

				resetErrorMessage();
			}
		});
		/* End Logic to get info from database */
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/'+editLink, function(req, res) {
	if(req.user && req.user.permission >= 20) {
		Equipment.findOne({_id: req.query.id}, function (err, equipment) {
			if (!err && equipment) {
				renderEdit(res,req,equipment);
			} else {
				res.render('edit', {
					error: "Equipment not found!",
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

		// for (const [field_post_key, field_post_value] of Object.entries(req.body)) {
		// 	if (req.body.hasOwnProperty(field_post_key)) {
		// 		if (field_post_key !== "id" && field_post_key !== "typeName" && field_post_key !== "quantity") {
		// 			if (field_post_key.includes('fieldName')) {
		// 				custom_fields.push({
		// 					fieldName: field_post_value,
		// 					fieldValue: ""
		// 				});
		// 			} else {
		// 				custom_fields[custom_fields.length - 1]['fieldValue'] = field_post_value;
		// 			}
		// 		}
		// 	}
		// }

		let equipment = {
			_id:req.body.id,
			typeName:req.body.typeName,
			quantity:req.body.quantity,
			customFields: getCustomFields(req)
		};
		let updates = {$set: {typeName: req.body.typeName, quantity: req.body.quantity, customFields: equipment.customFields}};
		console.log(updates);

		Equipment.updateOne({_id: req.body.id}, updates, {runValidators: true}, function (err, update) {
			if (!err) {
				message = "Successfully updated equipment: " + req.body.typeName;

				renderEdit(res,req,equipment);
			} else {
				error_msg = validationErr(err);

				renderEdit(res,req,equipment);
			}
		});
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.get('/'+addLink, function(req, res) {
	if(req.user && req.user.permission >= 20) {
		renderAdd(res,req,[]);
	} else {
		res.redirect('/');

		resetErrorMessage();
	}
});

router.post('/'+addLink, function(req, res) {
	if(req.user && req.user.permission >= 20) {
		let equipment_object = {};
		let custom_fields = [];

		equipment_object['typeName'] = req.body.typeName;
		equipment_object['quantity'] = req.body.quantity;
		equipment_object['customFields'] = getCustomFields(req);

		let new_equipment = new Equipment(equipment_object);

		/* Insert new equipment */
		new_equipment.save(function (error) {
			if (!error) {
				message = "Successfully added new equipment: " + req.body.typeName;
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
		Equipment.deleteOne({_id: req.query.id}, function (err) {
			if (!err) {
				res.render('view', {
					deleteMsg: "Successfully deleted equipment!",
					listLink: listLink,
					user:req.user
				});
			} else {
				console.log(err); // console log the error
				res.render('view', {
					error: "Equipment not found!",
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
