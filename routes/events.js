const express = require('express');
const router = express.Router();
const process = require('process');
const webpush = require('web-push');
const moment = require('moment');
const genFunctions = require('../functions/generalFunctions');

/* Model */
const Event = require('../models/Event');
const Equipment = require('../models/EqInventory');
const Staff = require('../models/staff_user');
const Visitor = require('../models/visitor_user');
const Archive = require('../models/EventArchive');
/* End Model */

const editLink = "edit-event";
const viewLink = "view-event";
const addLink = "add-event";
const deleteLink = "delete-event";
const listLink = "list-events";
const exportLink = "../export?type=Events";

webpush.setVapidDetails(
	"mailto:sglvelik@liv.ac.uk",
	process.env.PUBLIC_VAPID_KEY,
	process.env.PRIVATE_VAPID_KEY
);

/* Functions */
function validationErr(error) {
	var error_msg = "";

	if (error.name === "ValidationError") { // check if the error is from the validator
		if (typeof error.errors.eventName !== "undefined" &&
			error.errors.eventName !== null) {
			error_msg = error.errors.eventName.message
		}
		if (typeof error.errors.equipID !== "undefined" &&
			error.errors.equipID !== null) {
			error_msg = error.errors.equipID.message
		}
		if (typeof error.errors.eventTypeID !== "undefined" &&
			error.errors.eventTypeID !== null) {
			error_msg = error.errors.eventTypeID.message
		}
		if (typeof error.errors.staffMemberID !== "undefined" &&
			error.errors.staffMemberID !== null) {
			error_msg = error.errors.staffMemberID.message
		}
		if (typeof error.errors.role !== "undefined" &&
			error.errors.role !== null) {
			error_msg = error.errors.role.message
		}
		if (typeof error.errors.date !== "undefined" &&
			error.errors.date !== null) {
			error_msg = error.errors.date.message
		}
		if (typeof error.errors.location !== "undefined" &&
			error.errors.location !== null) {
			error_msg = error.errors.location.message
		}
		console.log(error_msg);
	}

	return error_msg;
}

function getPostedStaff(req) {
	var staff_use = [];

	for (const [field_post_key, field_post_value] of Object.entries(req.body)) {
		if (req.body.hasOwnProperty(field_post_key)) {
			if (field_post_key.includes('staffID')) {
				staff_use.push({
					_id: field_post_value,
					staffMemberID: field_post_value,
					role: ""
				});
			} else if (field_post_key.includes('staffRole')) {
				staff_use[staff_use.length - 1]['role'] = field_post_value;
			}

			// delete req.body[field_post_key];
		}
	}

	return staff_use;
}

function getPostedVisitors(req) {
	var visitor_attending = [];

	for (let [field_post_key, field_post_value] of Object.entries(req.body)) {
		if (req.body.hasOwnProperty(field_post_key)) {
			if (field_post_key.includes('visitor')) {
				visitor_attending.push({
					_id: field_post_value,
					visitorID: field_post_value
				});

				// delete req.body[field_post_key];
			}
		}
	}

	return visitor_attending;
}

function getPostedRooms(req) {
	var rooms_used = [];

	for (const [field_post_key, field_post_value] of Object.entries(req.body)) {
		if (req.body.hasOwnProperty(field_post_key)) {
			if (field_post_key.includes('roomID')) {
				rooms_used.push({
					_id: field_post_value,
					roomID: field_post_value
				});
			}

			// delete req.body[field_post_key];
		}
	}

	return rooms_used;
}
/* End Functions */

router.get('/archive-list', function (req, res, next){
	let columns = ["ID", "Event Name", "Options"];
	let error = null;
	let allEventTypes = genFunctions.getAllEventTypes();

	if(req.user && req.user.permission === 0){
		Archive.find({},{sort:{date:-1}},function(errArchive,archiveListDoc){
			let eventList = [];

			if(!errArchive){
				archiveListDoc.forEach(function(archive_event){
					eventList.push({
						id:archive_event.eventID,
						name:archive_event.eventName
					});
				});
			} else {
				console.log(errArchive);
				error = "No results to show.";
			}

			allEventTypes.then(function (eventTypes) {
				res.render('list', {
					title: 'Archive Events List',
					list: eventList,
					columns: columns,
					editLink: editLink,
					viewLink: viewLink,
					deleteLink: deleteLink,
					exportLink: exportLink,
					error: error,
					filter: "Events",
					type: "archive",
					eventTypes: eventTypes,
					user: req.user
				});
			});
		});
	} else {
		res.redirect('/');
	}
});

router.get('/participate-events-list', function (req, res, next) {
	let columns = ["ID", "Event Name", "Options"];
	var error = null;
	let allEventTypes = genFunctions.getAllEventTypes();
	let attendingEvents = [];

	if (req.user && req.user.permission === 0) {
		Staff.findOne({_id: req.user._id}, function (err, staffDoc) {
			if (err) console.log(err);

			staffDoc.attendingEvents.forEach(function(attending_event){
				attendingEvents.push(attending_event.eventID);
			});

			Event.find({_id: {$in: attendingEvents}}, null, {sort: {date:-1}}, function (err, events) {
				var eventList = [];

				events.forEach(function (event) {
					eventList.push({
						id: event._id,
						name: event.eventName,
					});
				});

				error = eventList.length === 0 ? "No results to show" : "";

				allEventTypes.then(function (eventTypes) {
					res.render('list', {
						title: 'Events List',
						list: eventList,
						columns: columns,
						editLink: editLink,
						viewLink: viewLink,
						deleteLink: deleteLink,
						exportLink: exportLink,
						error: error,
						filter: "Events",
						type: "participate",
						eventTypes: eventTypes,
						user: req.user
					});
				});
			});
		});
	} else if (req.user && req.user.permission === 1) {
		Visitor.findOne({_id: req.user._id}, function (err, visitorDoc) {
			if (err) console.log(err);

			visitorDoc.attendingEvents.forEach(function(attending_event){
				attendingEvents.push(attending_event.eventID);
			});

			Event.find({_id: {$in: attendingEvents}}, null, {sort: {date:-1}}, function (err, events) {
				var eventList = [];

				events.forEach(function (event) {
					eventList.push({
						id: event._id,
						name: event.eventName,
					});
				});

				error = eventList.length === 0 ? "You are not participating to any events. Please come back later or contact an administrator!" : ""

				allEventTypes.then(function (eventTypes) {
					res.render('list', {
						title: 'Events List',
						list: eventList,
						columns: columns,
						viewLink: viewLink,
						exportLink: exportLink,
						error: error,
						filter: "Events",
						type: "participate",
						eventTypes: eventTypes,
						user: req.user
					});
				});
			});
		});
	} else {
		res.redirect('/');
	}
});

router.get('/' + listLink, function (req, res, next) {
	if (req.user && req.user.permission === 0) {
		let columns = ["ID", "Event Name", "Options"];
		var error = "";
		let allEventTypes = genFunctions.getAllEventTypes();

		Event.find({}, null, {sort: {date:-1}}, function (err, events) {
			var eventList = [];

			events.forEach(function (event) {
				eventList.push({
					id: event._id,
					name: event.eventName,
				});
			});

			error = eventList.length === 0 ? "No results to show" : ""

			allEventTypes.then(function (eventTypes) {
				res.render('list', {
					title: 'Events List',
					list: eventList.reverse(),
					columns: columns,
					editLink: editLink,
					viewLink: viewLink,
					addLink: addLink,
					deleteLink: deleteLink,
					exportLink: exportLink,
					error: error,
					filter: "Events",
					type: "allList",
					eventTypes: eventTypes,
					user: req.user
				});
			});
		});
	} else {
		res.redirect('/');
	}
});

router.get('/' + viewLink, function (req, res, next) {
	if (req.user && (req.user.permission === 0 || req.user.permission === 1)) {
		/* Logic to get info from database */
		Event.findOne({_id: req.query.id}, async function (err, event) {
			if (!err && event) {
				var attending = false;

				if (req.user.permission === 1) {
					event.visitors.forEach(function (visitor) {
						if (visitor.visitorID === req.user._id) {
							attending = true;
						}
					});
				}

				if (req.user.permission === 0 || attending) {
					var equipment = await genFunctions.getEquipmentInfo(event.equipment);
					var rooms = await genFunctions.getRoomInfo(event.rooms);
					var event_type = await genFunctions.getEventType(event.eventTypeID);
					var staff = await genFunctions.getStaffInfo(event.staffChosen);
					var visitors = await genFunctions.getVisitorInfo(event.visitors);
					var numberOfSpaces = 0;
					var numberOfVisitors = 0;

					Promise.all([equipment, rooms, event_type, staff, visitors]).then((result) => {
						// equipment.forEach(function (equip) {
						// 	equip.customFields.forEach(function (field) {
						// 		if (field.fieldName === "Room Capacity" && parseInt(field.fieldValue)) {
						// 			numberOfSpaces = numberOfSpaces + (parseInt(field.fieldValue)*equip.quantity)
						// 		}
						// 	});
						// });

						rooms.forEach(function (room) {
							numberOfSpaces = numberOfSpaces + room.capacity;
						});

						visitors.forEach(function (visitor) {
							visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : "";
						});

						res.render('view', {
							title: 'Viewing event: ' + event.eventName,
							error: null,
							item: {
								ID: event._id,
								Name: event.eventName,
								Equipment: equipment,
								Rooms: rooms,
								"Event Spaces": numberOfSpaces,
								"Event Type": event_type,
								"Staff Chosen": staff,
								Date: event.date,
								"End Date": event.endDate ? event.endDate : "",
								Location: event.location,
								"Number of Visitors": numberOfVisitors
							},
							listLink: req.user.permission === 0 ? listLink : 'participate-events-list',
							deleteLink: req.user.permission === 0 ? deleteLink : null,
							editLink: req.user.permission === 0 ? editLink + '?id=' + event._id : null,
							user: req.user
						});
					});
				} else {
					res.redirect('events/participate-events-list');
				}
			} else {
				console.log(err);
				res.render('view', {
					error: "Event not found!",
					listLink: listLink,
					user: req.user
				});
			}
		});
		/* End Logic to get info from database */
	}
});

router.get('/' + editLink, function (req, res, next) {
	if (req.user && req.user.permission === 0) {
		Event.findOne({_id: req.query.id}, async function (err, event) {
			if (!err && event) {
				var equipment_use = await genFunctions.getEquipmentInfo(event.equipment);
				var rooms_use = await genFunctions.getRoomInfo(event.rooms);
				var event_type = await genFunctions.getEventType(event.eventTypeID);
				var staff_use = await genFunctions.getStaffInfo(event.staffChosen);
				var visitor_attending = await genFunctions.getVisitorInfo(event.visitors);
				var visitors = await genFunctions.getAllVisitor();
				var equipment = await genFunctions.getAllEquipment();
				var rooms = await genFunctions.getAllRooms();
				var staff = await genFunctions.getAllStaff();
				var eventTypes = await genFunctions.getAllEventTypes();

				Promise.all([equipment, equipment_use, event_type, staff, staff_use, visitors, visitor_attending, eventTypes]).then((result) => {
					var numberOfSpaces = 0;
					var numberOfVisitors = 0;
					var error = null;

					rooms.forEach(function (room) {
						numberOfSpaces = numberOfSpaces + room.capacity;
					});

					visitors.forEach(function (visitor) {
						visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : "";
					});

					equipment_use.forEach(function(equip){
						equip.quantity = equip.quantity + equip.reqQty;
					});

					if (numberOfSpaces < numberOfVisitors) error = 'Not enough spaces are assigned for the event';

					res.render('edit', {
						title: 'Editing event: ' + event.eventName,
						error: error,
						item: {
							ID: event._id,
							"Event Name": event.eventName,
							Location: event.location,
							Date: moment(event.date).format('YYYY-MM-DDTHH:mm'),
							"End Date": event.endDate ? moment(event.endDate).format('YYYY-MM-DDTHH:mm') : "",
							"Event Type": event_type,
							Equipment: equipment_use,
							Rooms: rooms_use,
							Staff: staff_use,
							Visitors: visitor_attending
						},
						eventTypes: eventTypes,
						staff: staff,
						equipment: equipment,
						rooms: rooms,
						visitors: visitors,
						customFields: false,
						equipmentFields: true,
						roomsFields: true,
						staffFields: true,
						visitorFields: true,
						editLink: '/events/' + editLink,
						cancelLink: viewLink + '?id=' + event._id,
						user: req.user
					});
				});
			} else {
				res.render('view', {
					error: "Event not found!",
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
	function getPostedEquipment(req) {
		var equipment_posted = [];

		for (const [field_post_key, field_post_value] of Object.entries(req.body)) {
			if (req.body.hasOwnProperty(field_post_key)) {
				if (field_post_key.includes('equipment')) {
					equipment_posted.push({
						_id: field_post_value,
						equipID: field_post_value,
						reqQty: 1
					});
				} else if (field_post_key.includes('quantity')) {
					equipment_posted[equipment_posted.length - 1]['reqQty'] = parseInt(field_post_value);
				}
			}
		}

		return equipment_posted;
	}

	function recoverQuantity(previousQuantity, equipmentNotUpdatedNames) {
		/* Recover quantity */
		for (let i = 0; i < previousQuantity.length; i++) {
			Equipment.updateOne({_id: previousQuantity[i]['equipID']}, {$set: {quantity: +previousQuantity[i]['reqQty']}}, function (err, eqDoc) {
				if (err) {
					console.log(err);
				}
			});
		}
		/* End Recover quantity */
	}

	if (req.user && req.user.permission === 0) {
		Event.findOne({_id: req.body.ID}, async function (errFindEvent, event) {
			if (!errFindEvent && event) {
				var equipment_use = await genFunctions.getEquipmentInfo(event.equipment);
				var rooms_user = await genFunctions.getRoomInfo(event.rooms);
				var event_type = await genFunctions.getEventType(event.eventTypeID);
				var staff_use = await genFunctions.getStaffInfo(event.staffChosen);
				var visitor_attending = await genFunctions.getVisitorInfo(event.visitors);
				var visitors = await genFunctions.getAllVisitor();
				var equipment = await genFunctions.getAllEquipment();
				var rooms = await genFunctions.getAllRooms();
				var staff = await genFunctions.getAllStaff();
				var eventTypes = await genFunctions.getAllEventTypes();

				let promisesEquip = [];
				let repostedEquip = [];
				let equipmentNotUpdated = [];
				let equipmentNotUpdatedNames = [];
				let previousQuantity = [];

				var posted_staff_use = getPostedStaff(req);
				var posted_visitors = getPostedVisitors(req);
				var posted_equipment = getPostedEquipment(req);
				var posted_rooms = getPostedRooms(req);

				Promise.all([equipment, rooms, equipment_use, event_type, staff, staff_use, visitors, visitor_attending, eventTypes]).then((result) => {
					var numberOfSpaces = 0;
					var numberOfVisitors = 0;
					var error = null;
					var message = null;

					posted_rooms.forEach(function (room) {
						numberOfSpaces = numberOfSpaces + room.capacity;
					});

					posted_visitors.forEach(function (visitor) {
						visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : "";
					});

					if (numberOfSpaces < numberOfVisitors) error = 'Not enough spaces are assigned for the event';

					staff_use.forEach(function (prev_staff_member) {
						var staff_posted = false;

						posted_staff_use.forEach(function (posted_staff_member) {
							if (posted_staff_member.staffMemberID == prev_staff_member._id) staff_posted = true;
						});

						if (!staff_posted) {
							Staff.updateOne({_id: prev_staff_member._id}, {$pull: {attendingEvents: {eventID: event._id}}}, function (errorUpdateStaff, staffDoc) {
								if (!errorUpdateStaff) {
									Staff.findOne({_id: prev_staff_member._id}, function (errFind, staffMemberDoc) {
										if (!errFind) {
											if (staffMemberDoc) {
												genFunctions.sendNotification(staffMemberDoc._id, "Event Update", "You have been removed from an event.")
												genFunctions.sendEmail(staffMemberDoc.email,null,null, null, null, "removed");
											} else {
												console.log("Staff member not found.");
											}
										} else {
											console.log(errFind);
										}
									});
								} else {
									console.log(errorUpdateStaff);
								}
							});
						}
					});

					posted_staff_use.forEach(function (posted_staff_member) {
						var new_staff = true;

						staff_use.forEach(function (prev_staff_member) {
							if (posted_staff_member.staffMemberID == prev_staff_member._id) new_staff = false;
						});

						if (new_staff) {
							Staff.findOne({_id: posted_staff_member.staffMemberID}, function (errorFindStaffEmail, staffDoc) {
								if (!errorFindStaffEmail) {
									genFunctions.sendNotification(staffDoc._id, "Event Participation", "You have been added to participate to an event.");
									genFunctions.sendEmail(staffDoc.email,null,null, null, null,"added");
								} else {
									console.log(errorFindStaffEmail);
								}
							});
						}
					});

					visitor_attending.forEach(function (prev_visitor) {
						var visitor_posted = false;

						posted_visitors.forEach(function (posted_visitor) {
							if (posted_visitor.visitorID == prev_visitor._id) visitor_posted = true;
						});

						if (!visitor_posted) {
							Visitor.updateOne({_id: prev_visitor._id}, {$pull: {attendingEvents: {eventID: event._id}}}, function (errorUpdateVisitor, visitorDoc) {
								if (errorUpdateVisitor) console.log(errorUpdateVisitor);
							});
						}
					});

					posted_visitors.forEach(function (posted_visitor) {
						var new_visitor = true;

						visitor_attending.forEach(function (prev_visitor) {
							if (posted_visitor.visitorID == prev_visitor._id) new_visitor = false;
						});

						if (new_visitor) {
							Visitor.findOne({_id: posted_visitor.visitorID}, function (errorFindVisitorEmail, visitorDoc) {
								if (!errorFindVisitorEmail) {
									genFunctions.sendNotification(visitorDoc._id, "Event Participation", "You have been added to participate to an event.");
									genFunctions.sendEmail(visitorDoc.contactEmail,null,null, null, null, "added");
								} else {
									console.log(errorFindVisitorEmail);
								}
							});
						}
					});

					/* Check for re-posted equipment */
					equipment_use.forEach(function (prev_equip) {
						var equipment_posted = false;
						var equip_qty = 0;

						posted_equipment.forEach(function (posted_equip) {
							if (posted_equip.equipID == prev_equip._id) {
								equipment_posted = true;
								repostedEquip.push(posted_equip.equipID);
								equip_qty = prev_equip.reqQty - posted_equip.reqQty;
								posted_equip['quantity'] = prev_equip.quantity + posted_equip.reqQty + equip_qty;
							}
						});

						if (!equipment_posted) {
							if (prev_equip.reqQty > 0) {
								promisesEquip.push(new Promise(function (resolve, reject) {
									Equipment.findOne({_id: prev_equip._id}, function (errFindEquip, equipFindDoc) {
										if (errFindEquip) console.log(errFindEquip);

										if(equipFindDoc) {
											previousQuantity.push({
												equipID: prev_equip._id,
												quantity: equipFindDoc.quantity
											});

											Equipment.updateOne({_id: prev_equip._id}, {$set: {quantity: prev_equip.quantity + prev_equip.reqQty}}, function (errorUpdateEquip, equipDoc) {
												if (errorUpdateEquip) {
													equipmentNotUpdated.push(prev_equip._id);
													equipmentNotUpdatedNames.push(equipFindDoc.typeName);

													console.log(errorUpdateEquip);
												}
											});
										} else {

										}

										resolve();
									});

								}));
							}
						} else if (equip_qty !== 0) {
							promisesEquip.push(new Promise(function (resolve, reject) {
								Equipment.findOne({_id: prev_equip._id}, function (errFindEquip, equipFindDoc) {
									if (!errFindEquip) {
										if (equipFindDoc && equipFindDoc.quantity - equip_qty >= 0) {
											previousQuantity.push({
												equipID: prev_equip._id,
												quantity: equipFindDoc.quantity
											});

											Equipment.updateOne({_id: prev_equip._id}, {$set: {quantity: equipFindDoc.quantity + equip_qty}}, function (errorUpdateEquip, equipDoc) {
												if (errorUpdateEquip) {
													equipmentNotUpdated.push(prev_equip._id);
													equipmentNotUpdatedNames.push(equipFindDoc.typeName);

													console.log(errorUpdateEquip);
												}

												resolve();
											});
										} else {
											console.log('Cannot update equipment, because insufficient quantity.');

											equipmentNotUpdated.push(prev_equip.equipID);
											equipmentNotUpdatedNames.push(equipFindDoc.typeName);

											resolve();
										}
									} else {
										console.log(errFindEquip);

										equipmentNotUpdated.push(prev_equip.equipID);
										equipmentNotUpdatedNames.push(equipFindDoc.typeName);

										resolve();
									}
								});
							}));
						}
					});

					/* End Check for re-posted equipment */

					posted_equipment.forEach(function (posted_equip) {
						if (!repostedEquip.includes(posted_equip.equipID)) { // check if equipment is re-posted
							promisesEquip.push(new Promise(function (resolve, reject) {
								Equipment.findOne({_id: posted_equip.equipID}, function (errFindEquip, equipFindDoc) {
									if (!errFindEquip) {
										if(equipFindDoc) {
											posted_equip['quantity'] = equipFindDoc.quantity;

											if (equipFindDoc.quantity - posted_equip.reqQty >= 0) {
												Equipment.updateOne({_id: posted_equip.equipID}, {$inc: {quantity: -posted_equip.reqQty}}, function (errorUpdateEquip, equipDoc) {
													if (errorUpdateEquip) {
														console.log(errorUpdateEquip);

														equipmentNotUpdated.push(posted_equip.equipID);
														equipmentNotUpdatedNames.push(equipFindDoc.typeName);
													}

													resolve();
												});
											} else {
												console.log('Cannot update equipment, because insufficient quantity.');

												equipmentNotUpdated.push(posted_equip.equipID);
												equipmentNotUpdatedNames.push(equipFindDoc.typeName);

												resolve();
											}
										} else {
											console.log('Cannot update equipment, because insufficient quantity.');

											equipmentNotUpdated.push(posted_equip.equipID);
											equipmentNotUpdatedNames.push(equipFindDoc.typeName);
										}
									} else {
										console.log(errFindEquip);

										equipmentNotUpdated.push(posted_equip.equipID);
										equipmentNotUpdatedNames.push(equipFindDoc.typeName);

										resolve();
									}
								});
							}));
						}
					});

					Promise.all(promisesEquip).then(function () {
						if (!equipmentNotUpdated.length > 0) {
							var event_type_update = {
								$set: {
									eventName: req.body['Event Name'],
									equipment: posted_equipment,
									rooms: posted_rooms,
									eventTypeID: req.body['Event Type'],
									staffChosen: posted_staff_use,
									date: req.body.Date,
									endDate: req.body['End Date'],
									location: req.body.Location,
									visitors: posted_visitors
								}
							};


							Event.updateOne({_id: req.body.ID}, event_type_update, function (errEventUpdate, eventUpdateDoc) {
								if (!errEventUpdate) {
									/* Notifications and emails */
									posted_staff_use.forEach(function (staffMember) {
										Staff.findOne({_id: staffMember.staffMemberID}, function (errorStaffSendEmail, staffMemberDoc) {
											if (!errorStaffSendEmail) {
												let attending = false;

												staffMemberDoc.attendingEvents.forEach(function(attending_event){
													if(attending_event.eventID == req.body.ID) attending = true;
												});

												if(!attending){
													Staff.updateOne({_id:staffMember.staffMemberID},{$push:{attendingEvents:{eventID:req.body.ID,role:staffMember.role}}}, function(errUpdateStaff, updateStaffDoc){
														if(errUpdateStaff) console.log(errUpdateStaff);
													});
												}
												genFunctions.sendNotification(staffMemberDoc._id, "Event Update", "An event that you are participating has been updated.");
												genFunctions.sendEmail(staffMemberDoc.email,null,null, null, null, "edited");
											}
										});
									});

									posted_visitors.forEach(function (visitor) {
										Visitor.findOne({_id: visitor.visitorID}, function (errorVisitorSendEmail, visitorDoc) {
											if (!errorVisitorSendEmail) {
												let attending = false;

												visitorDoc.attendingEvents.forEach(function(attending_event){
													if(attending_event.eventID == req.body.ID) attending = true;
												});

												if(!attending){
													Visitor.updateOne({_id:visitorDoc.visitorID},{$push:{attendingEvents:{eventID:req.body.ID}}}, function(errUpdateVisitor, updateVisitorDoc){
														if(errUpdateVisitor) console.log(errUpdateVisitor);
													});
												}
												genFunctions.sendNotification(visitorDoc._id, "Event Update", "An event that you are participating has been updated.")
												genFunctions.sendEmail(visitorDoc.contactEmail,null,null, null, null, "edited");
											}
										});
									});
									/* End Notifications and emails */

									message = "Successfully updated event: " + event.eventName;
								} else {
									console.log(errEventUpdate);
									error = "Unknown error occurred, please try again.";

									recoverQuantity(previousQuantity,equipmentNotUpdatedNames);
								}

								renderEditScreen();
							});
						} else {
							recoverQuantity(previousQuantity,equipmentNotUpdatedNames);

							if (equipmentNotUpdatedNames.length > 0) {
								error = 'Unable to edit event because the equipment with names: ';

								equipmentNotUpdatedNames.forEach(function (equipName) {
									error = error.concat('"'+equipName + '",');
								});

								error = error.concat(' have insufficient quantity, please revise all the data again and try to edit event again.');
							}

							renderEditScreen();
						}



						function renderEditScreen() {
							res.render('edit', {
								title: 'Editing event: ' + event.eventName,
								error: error,
								message: message,
								item: {
									ID: event._id,
									"Event Name": req.body['Event Name'],
									Location: req.body.Location,
									Date: moment(req.body.Date).format('YYYY-MM-DDTHH:mm'),
									"End Date": req.body['End Date'] ? moment(req.body['End Date']).format('YYYY-MM-DDTHH:mm') : "",
									"Event Type": req.body['Event Type'],
									Equipment: posted_equipment,
									Rooms: posted_rooms,
									Staff: posted_staff_use,
									Visitors: posted_visitors
								},
								eventTypes: eventTypes,
								staff: staff,
								equipment: equipment,
								rooms: rooms,
								visitors: visitors,
								customFields: false,
								equipmentFields: true,
								roomsFields: true,
								staffFields: true,
								visitorFields: true,
								editLink: '/events/' + editLink,
								cancelLink: viewLink + '?id=' + event._id,
								user: req.user
							});
						}
					});
				});
			} else {
				console.log(errFindEvent);
				res.render('view', {
					error: "Event not found!",
					listLink: listLink,
					user: req.user
				});
			}
		});
	} else {
		res.redirect('/');
	}
});

router.get('/events/archive/' + deleteLink, function (req, res, next) {
	if (req.user && req.user.permission === 0) {
		genFunctions.deleteEvent(req.query.id,"archive").then(function(result){
			res.render('view', {
				deleteMsg: result,
				listLink: listLink,
				user: req.user
			});
		}).catch(function(error){
			res.render('view', {
				error: error,
				listLink: listLink,
				user: req.user
			});
		});
	} else {
		res.redirect('/');
	}
});

router.get('/' + deleteLink, function (req, res, next) {
	if (req.user && req.user.permission === 0) {
		genFunctions.deleteEvent(req.query.id,"event-list").then(function(result){
			res.render('view', {
				deleteMsg: result,
				listLink: listLink,
				user: req.user
			});
		}).catch(function(error){
			res.render('view', {
				error: error,
				listLink: listLink,
				user: req.user
			});
		});
	} else {
		res.redirect('/');
	}
});

router.get('/' + addLink, async function (req, res, next) {
	if (req.user && req.user.permission === 0) {
		let fields = [{name: "Event Name", type: "text", identifier: "name"},
			{name: "Location", type: "text", identifier: "location"},
			{name: "Date", type: "datetime-local", identifier: "date"},
			{name: "End Date", type: "datetime-local", identifier: "endDate"},
			{name: "Event Type", type: "select", identifier: "eventType"}];

		var visitors = await genFunctions.getAllVisitor();
		var equipment = await genFunctions.getAllEquipment();
		var rooms = await genFunctions.getAllRooms();
		var staff = await genFunctions.getAllStaff();
		var eventTypes = await genFunctions.getAllEventTypes();

		Promise.all([equipment, eventTypes, visitors, staff]).then((result) => {
			res.render('add', {
				title: 'Add New Event',
				fields: fields,
				cancelLink: listLink,
				customFields: false,
				equipmentFields: true,
				roomsFields: true,
				staffFields: true,
				visitorFields: true,
				visitors: visitors,
				equipment: equipment,
				rooms: rooms,
				eventTypes: eventTypes,
				staff: staff,
				user: req.user
			});
		});
	} else {
		res.redirect('/');
	}
});

router.post('/' + addLink, async function (req, res, next) {
	if (req.user && req.user.permission === 0) {
		let fields = [{name: "Event Name", type: "text", identifier: "name"},
			{name: "Location", type: "text", identifier: "location"},
			{name: "Date", type: "datetime-local", identifier: "date"},
			{name: "End Date", type: "datetime-local", identifier: "endDate"},
			{name: "Event Type", type: "select", identifier: "eventType"}];

		var error_msg = "";
		var message = "";
		var visitors = await genFunctions.getAllVisitor();
		var equipment = await genFunctions.getAllEquipment();
		var rooms = await genFunctions.getAllRooms();
		var staff = await genFunctions.getAllStaff();
		var eventTypes = await genFunctions.getAllEventTypes();
		var equipment_use = [];
		var rooms_use = getPostedRooms(req);
		var staff_use = getPostedStaff(req);
		var visitor_attending = getPostedVisitors(req);
		var numberOfSpaces = 0;
		var numberOfVisitors = 0;
		let promisesEquip = [];
		let equipmentNotUpdated = [];
		let equipmentNotUpdatedNames = [];

		for (const [field_post_key, field_post_value] of Object.entries(req.body)) {
			if (req.body.hasOwnProperty(field_post_key)) {
				if (field_post_key.includes('equipment')) {
					equipment_use.push({
						equipID: field_post_value,
						reqQty: 1
					});
				} else if (field_post_key.includes('quantity')) {
					equipment_use[equipment_use.length - 1]['reqQty'] = parseInt(field_post_value);

					promisesEquip.push(new Promise(function (resolve, reject) {
						Equipment.findOne({_id: equipment_use[equipment_use.length - 1]['equipID']}, function (errFindEquip, equipmentFoundDoc) {
							if (!errFindEquip) {
								if (equipmentFoundDoc && equipmentFoundDoc.quantity >= equipment_use[equipment_use.length - 1]['reqQty']) {
									Equipment.updateOne({_id: equipment_use[equipment_use.length - 1]['equipID']}, {$inc: {quantity: -equipment_use[equipment_use.length - 1]['reqQty']}}, function (err, eqDoc) {
										if (err) {
											console.log("Failed to update quantity for id:" + equipment_use[equipment_use.length - 1]['equipID']);
											console.log(err);
										}
										resolve();
									});
								} else {
									equipmentNotUpdated.push(equipment_use[equipment_use.length - 1]['equipID']);
									if (equipmentFoundDoc) equipmentNotUpdatedNames.push(equipmentFoundDoc.typeName);

									resolve();
								}
							} else {
								console.log(errFindEquip);
								resolve();
							}
						});
					}));
				}
			}
		}


		rooms_use.forEach(function (room) {
			numberOfSpaces = numberOfSpaces + room.capacity;
		});

		visitor_attending.forEach(function (visitor) {
			visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : "";
		});

		if (numberOfSpaces < numberOfVisitors) error_msg = 'Not enough spaces are assigned for the event';

		Promise.all(promisesEquip).then(function () {
			if (!(equipmentNotUpdated.length > 0)) {
				let new_event = new Event({
					eventName: req.body['Event Name'],
					equipment: equipment_use,
					rooms: rooms_use,
					eventTypeID: req.body['Event Type'],
					staffChosen: staff_use,
					date: req.body.Date,
					endDate: req.body['End Date'],
					location: req.body.Location,
					visitors: visitor_attending
				});

				new_event.save(function (error, eventDoc) {
					if (!error) {
						staff_use.forEach(function (staff_member) {
							Staff.findOne({_id: staff_use.staffMemberID}, function (err, staffDoc) {
								if (!err && staffDoc) {
									Staff.updateOne({_id: staff_use.staffMemberID}, {
										$push: {
											attendingEvents: {
												eventID: eventDoc._id,
												role: staff_use.role
											}
										}
									}, function (errUpdate, staffDoc) {
										if (errUpdate) {
											console.log(errUpdate);
										} else {
											genFunctions.sendNotification(staffDoc._id, "Participating Event", "You are a participant to a new event.");
											genFunctions.sendEmail(staffDoc.email,null,null, null, null, "added");
										}
									});
								} else { // staff not found or error with database
									console.log(err);
								}
							});
						});

						visitor_attending.forEach(function (staff_member) {
							Visitor.findOne({_id: visitor_attending.visitorID}, function (err, visitorDoc) {
								if (!err && visitorDoc) {
									Visitor.updateOne({_id: visitor_attending.visitorID}, {$push: {attendingEvents: {eventID: eventDoc._id}}}, function (errUpdate, visitorDoc) {
										if (errUpdate) {
											console.log(errUpdate);
										} else {
											genFunctions.sendNotification(visitorDoc._id, "Participating Event", "You are a participant to a new event.");
											genFunctions.sendEmail(visitorDoc.contactEmail,null,null, null, null, "added");
										}
									});
								} else { // visitor not found or error with database
									console.log(err);
								}
							});
						});

						message = "Successfully create new event: " + req.body['Event Name'];
						// sendInvitationEmail(req.body.Email, password_to_insert, req.body.Role);
					} else {
						error_msg = validationErr(error);
					}


				});
			} else {
				/* Recover quantity */
				for (let i = 0; i < equipment_use.length; i++) {
					if (!equipmentNotUpdated.includes(equipment_use[i]['equipID'])) {
						Equipment.updateOne({_id: equipment_use[i]['equipID']}, {$inc: {quantity: +equipment_use[i]['reqQty']}}, function (err, eqDoc) {
							if (err) {
								console.log(err);
							}
						});
					}
				}
				/* End Recover quantity */

				if (equipmentNotUpdatedNames.length > 0) {
					error_msg = 'Unable to add event because the equipment with names: ';

					equipmentNotUpdatedNames.forEach(function (equipName) {
						error_msg = error_msg.concat('"'+equipName + '",');
					});

					error_msg = error_msg.concat(' have insufficient quantity, please revise all the data again and try to add event again.');
				}
			}

			Promise.all([equipment, rooms, eventTypes, visitors, staff]).then((result) => {
				res.render('add', {
					title: 'Add New Event',
					error: error_msg,
					message: message,
					fields: fields,
					cancelLink: listLink,
					customFields: false,
					roomsFields: true,
					equipmentFields: true,
					staffFields: true,
					visitorFields: true,
					visitors: visitors,
					equipment: equipment,
					rooms: rooms,
					eventTypes: eventTypes,
					staff: staff,
					selectedEventType: req.body['Event Type'],
					selectedStaff: staff_use,
					selectedEquip: equipment_use,
					selectedRooms: rooms_use,
					selectedVisitors: visitor_attending,
					user: req.user
				});
			});
		});
	} else {
		res.redirect('/');
	}
});



module.exports = router;
