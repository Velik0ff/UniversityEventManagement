const webpush = require('web-push');
const mongoose = require('mongoose');

/* Model */
const Event = require('../models/Event');
const EventType = require('../models/EventType');
const Equipment = require('../models/EqInventory');
const Staff = require('../models/staff_user');
const Visitor = require('../models/visitor_user');
const Room = require('../models/Room');
const SubNotification = require('../models/SubNotification');
/* End Model */

function getEquipmentInfo(event_equipment){
	return new Promise((resolve,reject) => {
		var event_equip_ids_arr = [];

		event_equipment.forEach((event_eq)=>{
			event_equip_ids_arr.push(event_eq.equipID);
		});

		Equipment.find({_id:{$in:event_equip_ids_arr}}, function (err, equipment) {
			if(!err){
				event_equipment.forEach(function(equip_chosen){
					equipment.forEach(function(equip){
						equip.reqQty = equip_chosen.reqQty;
					});
				});
				resolve(equipment)
			} else {
				resolve([]);
				console.log(err);
			}
		});
	});
}

function getRoomInfo(event_rooms){
	return new Promise((resolve,reject) => {
		var event_room_ids_arr = [];

		event_rooms.forEach((event_room)=>{
			event_room_ids_arr.push(event_room.roomID);
		});

		Room.find({_id:{$in:event_room_ids_arr}}, function (err, rooms) {
			if(!err){
				resolve(rooms);
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
				let staff_members = [];
				staff_chosen.forEach(function(staff_member_chosen){
					staff.forEach(function(staff_member){
						if(staff_member_chosen.staffMemberID == staff_member._id){
							staff_members.push(staff_member);
							staff_members[staff_members.length-1].role = staff_member_chosen.role;
						}
					});
				});
				resolve(staff_members);
			} else {
				resolve([]);
				console.log(err);
			}
		});
	});
}

function getVisitorInfo(visitors){
	return new Promise((resolve,reject) => {
		var visitors_ids_arr = [];

		visitors.forEach((visitor)=>{
			visitors_ids_arr.push(mongoose.Types.ObjectId(visitor.visitorID))
		});

		Visitor.find({_id:{$in:visitors_ids_arr}}, function (err, visitorsDoc) {
			if(!err){
				resolve(visitorsDoc);
			} else {
				resolve(visitorsDoc);
				console.log(err);
			}
		});
	});
}

function getAllStaff(){
	return new Promise((resolve,reject) => {
		Staff.find({}, function (err, staff) {
			if(!err){
				resolve(staff)
			} else {
				resolve([]);
				console.log(err);
			}
		});
	});
}

function getAllEquipment(){
	return new Promise((resolve,reject) => {
		Equipment.find({}, function (err, equipment) {
			if(!err){
				resolve(equipment)
			} else {
				resolve([]);
				console.log(err);
			}
		});
	});
}

function getAllRooms(){
	return new Promise((resolve,reject) => {
		Room.find({}, function (err, rooms) {
			if(!err){
				resolve(rooms)
			} else {
				resolve([]);
				console.log(err);
			}
		});
	});
}

function getAllVisitor(){
	return new Promise((resolve,reject) => {
		Visitor.find({}, function (err, visitors) {
			if(!err){
				resolve(visitors);
			} else {
				resolve(visitors);
				console.log(err);
			}
		});
	});
}

function getAllEventTypes(){
	return new Promise((resolve,reject) => {
		EventType.find({}, function (err, event_types) {
			if(!err){
				resolve(event_types);
			} else {
				resolve(event_types);
				console.log(err);
			}
		});
	});
}

function sendNotification(userID,title,body){
	SubNotification.findOne({userID:userID},function(errFind,subNotifDoc){
		if(!errFind && subNotifDoc){
			const payload = JSON.stringify({
        title: title,
        body: body
   		});

			webpush.sendNotification(subNotifDoc.notification, payload);
		} else {
			console.log(errFind);
		}
	});
}

module.exports = {
	getEquipmentInfo:getEquipmentInfo,
	getRoomInfo:getRoomInfo,
	getEventType:getEventType,
	getStaffInfo:getStaffInfo,
	getVisitorInfo:getVisitorInfo,
	getAllStaff:getAllStaff,
	getAllEquipment:getAllEquipment,
	getAllRooms:getAllRooms,
	getAllVisitor:getAllVisitor,
	getAllEventTypes:getAllEventTypes,
	sendNotification:sendNotification
}