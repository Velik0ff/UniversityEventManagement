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

/* Functions */
function validationErr(error){
	let error_msg = "";

	if(error.name === "ValidationError"){ // check if the error is from the validator
		if (typeof error.errors.typeName !== "undefined" &&
			error.errors.typeName !== null) {
			error_msg = error.errors.typeName.message
		}
		if (typeof error.errors.quantity !== "undefined" &&
			error.errors.quantity !== null) {
			error_msg = error.errors.quantity.message
		}
		console.log(error_msg);
	} else {
		error_msg = "Unknown error has occurred during adding equipment. Please try again later.";
		console.log(error);
	}

	return error_msg;
}

function renderAdd(res,req,listLink,addLink,fields,custom_fields,error_msg,message){
	res.render('add', {
		title: 'Add New Equipment',
		fields: fields,
		cancelLink: listLink,
		addLink: '/equipment/' + addLink,
		customFields: true,
		customFieldsValues: custom_fields,
		error: error_msg,
		message: message,
		user:req.user
	});
}

function renderEdit(res,req,equipment,editLink,viewLink,error,message){
	res.render('edit', {
		title: 'Editing equipment: ' + req.body.Name,
		error: error,
		errorCritical: false,
		message: message,
		item: {
			ID: equipment._id,
			Name: equipment.typeName,
			Quantity: equipment.quantity,
			customFieldsValues: equipment.customFields
		},
		customFields: true,
		editLink: '/equipment/' + editLink,
		cancelLink: viewLink + '?id=' + req.body.ID,
		user:req.user
	});
}
/* End Functions */

router.get('/'+listLink, function(req, res, next) {
	if(req.user && req.user.permission >= 20) {
		let columns = ["ID", "Name", "Quantity", "Options"];
		let error = "";

		Equipment.find({}, function (err, equipment) {
			let equipmentList = [];

			equipment.forEach(function (equip) {
				equipmentList.push({
					id: equip._id,
					name: equip.typeName,
					quantity: equip.quantity,
				});
			});

			error = equipmentList.length === 0 ? "No results to show" : ""

			res.render('list', {
				title: 'Equipment List',
				list: equipmentList,
				columns: columns,
				editLink: editLink,
				viewLink: viewLink,
				addLink: addLink,
				deleteLink: deleteLink,
				exportLink: exportLink,
				error: error,
				user:req.user
			});
		});
	} else {
		res.redirect('/');
	}
});

router.get('/'+viewLink, function(req, res, next) {
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
					deleteLink: req.user.permission >= 30 ? deleteLink : null,
					editLink: editLink + '?id=' + equipment._id,
					user:req.user
				});
			} else {
				res.render('view', {
					error: "Equipment not found!",
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

router.get('/'+editLink, function(req, res, next) {
	if(req.user && req.user.permission >= 20) {
		Equipment.findOne({_id: req.query.id}, function (err, equipment) {
			if (!err && equipment) {
				renderEdit(res,req,equipment,editLink,viewLink,null,null);
			} else {
				res.render('edit', {
					error: "Equipment not found!",
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
	if(req.user && req.user.permission >= 20) {
		let message = null;
		let error = null;
		let custom_fields = [];

		for (const [field_post_key, field_post_value] of Object.entries(req.body)) {
			if (req.body.hasOwnProperty(field_post_key)) {
				if (field_post_key !== "ID" && field_post_key !== "Name" && field_post_key !== "Quantity") {
					if (field_post_key.includes('fieldName')) {
						custom_fields.push({
							fieldName: field_post_value,
							fieldValue: ""
						});
					} else {
						custom_fields[custom_fields.length - 1]['fieldValue'] = field_post_value;
					}
				}
			}
		}

		let equipment = {
			_id:req.body.ID,
			typeName:req.body.Name,
			quantity:req.body.Quantity,
			customFields: custom_fields
		};
		let updates = {$set: {typeName: req.body.Name, quantity: req.body.Quantity, customFields: custom_fields}};

		Equipment.updateOne({_id: req.body.ID}, updates, {runValidators: true}, function (err, update) {
			if (!err && update) {
				message = "Successfully updated equipment: " + req.body.Name;

				renderEdit(res,req,equipment,editLink,viewLink,error,message);
			} else if (!update) {
				res.render('edit', {
					error: "Equipment not found!",
					errorCritical: true,
					listLink: listLink,
					user:req.user
				});
			} else {
				error = validationErr(err);

				renderEdit(res,req,equipment,editLink,viewLink,error,message);
			}
		});
	} else {
		res.redirect('/');
	}
});

router.get('/'+addLink, function(req, res, next) {
	if(req.user && req.user.permission >= 20) {
		let fields = [{name: "Name", type: "text", identifier: "Name"},
			{name: "Quantity", type: "number", identifier: "Quantity"}];

		renderAdd(res,req,listLink,addLink,fields,null,null,null);
	} else {
		res.redirect('/');
	}
});

router.post('/'+addLink, function(req, res, next) {
	if(req.user && req.user.permission >= 20) {
		let error_msg = null;
		let message = null;
		let fields = [{name: "Name", type: "text", identifier: "Name"},
			{name: "Quantity", type: "number", identifier: "Quantity"}];

		let equipment_object = {};
		let custom_fields = [];

		equipment_object['typeName'] = req.body.Name;
		equipment_object['quantity'] = req.body.Quantity;

		for (const [field_post_key, field_post_value] of Object.entries(req.body)) {
			if (req.body.hasOwnProperty(field_post_key)) {
				if (field_post_key !== "Name" && field_post_key !== "Quantity") {
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

		equipment_object['customFields'] = custom_fields;

		let new_equipment = new Equipment(equipment_object);

		/* Insert new equipment */
		new_equipment.save(function (error, equipmentDoc) {
			if (!error) {
				message = "Successfully added new equipment: " + req.body.Name;
				console.log(message);
			} else {
				error_msg = validationErr(error);
			}

			renderAdd(res,req,listLink,addLink,fields,custom_fields,error_msg,message);
		});
		/* End Insert new equipment */
	} else {
		res.redirect('/');
	}
});

router.get('/'+deleteLink, function(req, res, next) {
	if(req.user && req.user.permission >= 30) {
		Equipment.deleteOne({_id: req.query.id}, function (err, deleteResult) {
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
		});
	} else {
		res.redirect('/');
	}
});

module.exports = router;
