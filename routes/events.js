const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/* Model */
const Event = require('../models/Event');
const EventType = require('../models/EventType');
const Equipment = require('../models/EqInventory');
const Staff = require('../models/staff_user');
/* End Model */

const editLink = "edit-event";
const viewLink = "view-event";
const addLink = "add-event";
const deleteLink = "delete-event";
const listLink = "list-event";

/* Functions */
function getEquipmentInfo(event_equipment){
	return new Promise((resolve,reject) => {
		var event_equip_ids_arr = [];

		event_equipment.forEach((event_eq)=>{
			event_equip_ids_arr.push(mongoose.Types.ObjectId(event_eq.equipID));
		});

		Equipment.find({_id:{$in:event_equip_ids_arr}}, function (err, equipment) {
			if(!err){
				resolve(equipment)
			} else {
				resolve([]);
				console.log(err);
			}
		});
	});
}

function getEventType(event_type_id){
	return new Promise((resolve,reject) => {
		EventType.findOne({_id:event_type_id}, function (err, event_type) {
			if(!err){
				resolve(event_type);
			} else {
				resolve(event_type);
				console.log(err);
			}
		});
	});
}

function getStaffInfo(staff_chosen){
	return new Promise((resolve,reject) => {
		var staff_ids_arr = [];

		staff_chosen.forEach((staff)=>{
			staff_ids_arr.push(mongoose.Types.ObjectId(staff.staffMemberID));
		});

		Staff.find({_id:{$in:staff_ids_arr}}, function (err, staff) {
			if(!err){
				resolve(staff)
			} else {
				resolve([]);
				console.log(err);
			}
		});
	});
}
/* End Functions */

router.get('/list-events', function(req, res, next) {
	let columns = ["ID", "Event Name", "Options"];
	var error = "";

	Event.find({}, function (err, events) {
		var eventList = [];

		events.forEach(function (event) {
			eventList.push({
				id:event._id,
				name:event.eventName,
			});
		});

		error = eventList.length === 0 ? "No results to show" : ""

		res.render('list', {
			title: 'Events List',
			list:eventList,
			columns:columns,
			editLink: editLink,
			viewLink: viewLink,
			addLink: addLink,
			deleteLink: deleteLink,
			error:error
		});
	});
});

router.get('/view-event', function(req, res, next) {
	/* Logic to get info from database */
	Event.findOne({_id:req.query.id}, function (err, event) {
		if(!err && event){
			var equipment = getEquipmentInfo(event.equipment);
			var event_type = getEventType(event.eventTypeID);
			var staff = getStaffInfo(event.staffChosen);

			Promise.all([equipment,event_type,staff]);

			res.render('view', {
				title: 'Viewing event: '+event.eventName,
				error:null,
				item:{
					ID:event._id,
					Name:event.eventName,
					Equipment:equipment,
					"Event Spaces":event.eventSpaces,
					"Event Type":event_type,
					// "Staff Required":
					"Staff Chosen":staff,
					Date:event.date,
					Location:event.location,
					"Number of Visitors":event.numberOfVisitors
				},
				listLink: listLink,
				deleteLink: deleteLink,
				editLink: editLink+'?id='+event._id
			});
		} else {
			res.render('view', {
				error:"Event not found!",
				listLink: listLink
			});
		}
	});
	/* End Logic to get info from database */
});

router.get('/edit-event', function(req, res, next) {
	// list.forEach((item)=>{
	// 	if(item.id == req.query.id){
	// 		// let rows = [{"ID":}, "Event Name"];
	// 		// let item_info = [item.id,item.name];
	//
	// 		let item_info = {
	// 			"ID":item.id,
	// 			"Name":item.name,
	// 			"Equipment":"Some Equipment info here",
	// 			"Staff":"John Doe - IT Support",
	// 			"Location":"Ashton Building",
	// 			"Date":"25/12/2019"
	// 		}
	//
	// 		res.render('edit', {
	// 			title: 'Editing event: '+item.name,
	// 			// rows: rows,
	// 			item:item_info,
	// 			editLink: 'view-event?id='+item.id,
	// 			cancelLink: 'view-event?id='+item.id
	// 		});
	// 	}
	// });
});

router.get('/add-event', function(req, res, next) {
	// let rows = [{"ID":}, "Event Name"];
	// let item_info = [item.id,item.name];

	let fields = [{name:"Event Name",type:"text",identifier:"name"},
		{name:"Location",type:"text",identifier:"location"},
		{name:"Date",type:"date",identifier:"date"}]

	res.render('add', {
		title: 'Add New Staff Member',
		// rows: rows,
		fields:fields,
		cancelLink: 'list-events',
		customFields:false,
		equipmentFields:true,
		staffFields:true,
		visitorFields:true,
	});
});

module.exports = router;
