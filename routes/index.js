const express = require('express');
const router = express.Router();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy; /* this should be after passport*/
const process = require('process');
const mongoose = require('mongoose');
const json2csv = require('json2csv').parse;
const genFunctions = require('../functions/generalFunctions');

/* Models */
const Room = require('../models/Room');
const Event = require('../models/Event');
const Staff = require('../models/staff_user');
const Visitor = require('../models/visitor_user');
const SubNotification = require('../models/SubNotification');
const Archive = require('../models/EventArchive');
const Role = require('../models/Role');
/* End Models */

passport.use(new LocalStrategy(
	function (username, password, done) {
		Staff.findOne({email: username}, function (err, user) {
			if (err) {
				return done(err);
			}
			if (user) {
				if (!user.comparePassword(password)) {
					return done(null, false, {message: 'Incorrect password.'});
				}

				return done(null, {
					_id: user._id,
					username: user.email,
					permission: user.permission,
					role: user.role
				});
			} else {
				Visitor.findOne({contactEmail: username}, function (err, visitor) {
					if (err) {
						return done(err);
					}
					if (visitor) {
						if (!visitor.comparePassword(password)) {
							return done(null, false, {message: 'Incorrect password.'});
						}

						return done(null, {
							_id: visitor._id,
							username: visitor.contactEmail,
							permission: 'visitor',
							role: null
						});
					} else {
						return done(null, false, {message: 'Incorrect username.'});
					}
				});
			}
		});
	}
));

passport.serializeUser(function (user, done) {
	done(null, user._id);
});

passport.deserializeUser(function (id, done) {
	Staff.findOne({_id: id}, function (err, user) {
		// done(err, user);
		if (user) {
			done(err, {
				_id: user._id,
				username: user.email,
				permission: user.permission,
				role: user.role
			});
		} else {
			Visitor.findOne({_id: id}, function (err, visitor) {
				if (visitor) {
					done(err, {
						_id: visitor._id,
						username: visitor.contactEmail,
						permission: visitor.permission
					});
				} else {
					done(err, visitor);
				}
			});
		}
	});
});

/* Functions */
function validationErr(error) {
	let error_msg = "";

	if (error.name === "ValidationError") { // check if the error is from the validator
		if (typeof error.errors.password !== "undefined" &&
			error.errors.password !== null) {
			error_msg = error.errors.password.message
		}
		console.log(error_msg);
	}

	return error_msg;
}

function renderLogin(res, req, username, error, message) {
	let fields = [{name: "Email", type: "email", identifier: "username"},
		{name: "Password", type: "password", identifier: "password"}];

	fields[0].value = username;

	return res.render('small', {
		title: "Log in",
		message: message,
		error: error,
		fields: fields,
		submitButton: {title: "Log in"},
		formAction: "/authorize",
		user: req.user
	});
}

function renderChangePassword(res, user, error, message, reset_pass) {
	let fields = [];

	if (!reset_pass) {
		fields.push({name: "Old Password", type: "password", identifier: "oldPass"});
	} else {
		fields.push({name: "Reset Code", type: "hidden", identifier: "resetCode"});
	}
	fields = fields.concat([{name: "New Password", type: "password", identifier: "newPass"},
		{name: "Confirm Password", type: "password", identifier: "confirmPass"}]);

	return res.render('small', {
		title: "Change Password",
		message: message,
		error: error,
		fields: fields,
		submitButton: {title: "Submit"},
		formAction: "/change-password",
		user: user
	});
}

function renderForgotPassword(res, req, error, message) {
	let fields = [{name: "E-mail", type: "email", identifier: "username"}];

	return res.render('small', {
		title: "Forgot Password",
		message: message,
		error: error,
		fields: fields,
		submitButton: {title: "Submit"},
		formAction: "/forgot-password",
		user: req.user
	});
}
/* End Functions */

/* GET login page. */
router.get('/', function (req, res) {
	if (req.user && req.user.permission < 0) {
		res.redirect('/change-password');
	} else if (req.user) {
		res.redirect('/welcome');
	} else {
		renderLogin(res, req, null, null, null);
	}
});

router.get('/welcome', function (req, res) {
	res.render('index', {
		title: "University of Liverpool Outreach Events",
		user: req.user,
		publicKey: process.env.PUBLIC_VAPID_KEY
	});
});

router.post('/authorize', function (req, res, next) {
	passport.authenticate('local', function (err, user) {
		if (err) { // error has occurred
			console.log(err);
			renderLogin(res, req, req.body.username, "Unknown error has occurred", null);
		}
		if (!user) { // authentication failed
			console.log(user)
			renderLogin(res, req, req.body.username, "Credentials are not valid", null);
		}
		req.logIn(user, function (err) {
			if (err) { // error has occurred
				console.log(err);
				renderLogin(res, req, req.body.username, "Unknown error has occurred", null);
			}

			if (req.user && req.user.permission >= 0) {
				res.redirect('/welcome');
			} else if (req.user && req.user.permission < 0) {
				res.redirect('/change-password');
			}
		});
	})(req, res, next);
});

router.get('/change-password', function (req, res) {
	if (req.user) {
		renderChangePassword(res, req.user, null, null, false);
	} else if (req.query.reset_code) {
		Staff.findOne({resetPassCode: req.query.reset_code}, function (errStaff, staff_member) {
			if (!errStaff) {
				if (staff_member) {
					renderChangePassword(res, staff_member, null, null, true);
				} else {
					Visitor.findOne({resetPassCode: req.query.reset_code}, function (errVisitor, visitor) {
						if (!errVisitor) {
							if (visitor) {
								renderChangePassword(res, staff_member, null, null, true);
							} else {
								console.log(errVisitor);
								res.redirect('/login');
							}
						} else {
							console.log(errVisitor);
							res.redirect('/login');
						}
					});
				}
			} else {
				console.log(errStaff);
				res.redirect('/login');
			}
		});
		renderChangePassword(res, req.user, null, null);
	} else {
		res.redirect('/login');
	}
});

router.post('/change-password', function (req, res) {
	if (req.user) {
		if (!req.body['resetCode']) {
			if (req.user.permission === -1 || req.user.permission >= 10) {
				Staff.findOne({email: req.user.username}, function (errFindStaff, staff_member) {
					if (!errFindStaff) {
						if (staff_member) {
							if (staff_member.comparePassword(req.body['oldPass'])) {
								Role.findOne({roleName:staff_member.role},function(errFindRole,roleDoc){
									let rolePermission = 10;

									if(errFindRole) console.log(errFindRole);

									if(roleDoc) rolePermission = roleDoc.rolePermission;

									let updates = {$set: {password: staff_member.hashPassword(req.body['newPass']), permission: rolePermission}};
									let term_permission = req.user.permission;

									Staff.updateOne({email: req.user.username}, updates, {runValidators: true}, function (err, update) {
										if (!err && update) {
											if (term_permission === -1) {
												res.redirect('/welcome');
											} else {
												renderChangePassword(res, req.user, null, "Successfully changed password!", false);
											}
										} else {
											let error = !update ? "User not found!" : validationErr(err);

											renderChangePassword(res, req.user, error, null, false);
										}
									});
								});
							} else {
								renderChangePassword(res, req.user, "The old password is not right, please try again.", null, false);
							}
						} else {
							renderChangePassword(res, req.user, "User not found!", null, false);
						}
					} else {
						console.log(errFindStaff);
						renderChangePassword(res, req.user, errFindStaff, null, false);
					}
				});
			} else if (req.user.permission === -2 || req.user.permission === 1) {
				Visitor.findOne({contactEmail: req.user.username}, function (errFindVisitor, visitor) {
					if (!errFindVisitor) {
						if (visitor) {
							if (visitor.comparePassword(req.body['oldPass'])) {
								let updates = {$set: {password: visitor.hashPassword(req.body['newPass']), permission: 1}};
								let term_permission = req.user.permission;

								Visitor.updateOne({contactEmail: req.user.username}, updates, {runValidators: true}, function (err, update) {
									if (!err && update) {
										if (term_permission === -1) {
											res.redirect('/welcome');
										} else {
											renderChangePassword(res, req.user, null, "Successfully changed password!", false);
										}
									} else {
										let error = !update ? "User not found!" : validationErr(err);

										renderChangePassword(res, req.user, error, null, false);
									}
								});
							} else {
								renderChangePassword(res, req.user, "The old password is not right, please try again.", null, false);
							}
						} else {
							renderChangePassword(res, req.user, "User not found!", null, false);
						}
					} else {
						console.log(errFindVisitor);
						renderChangePassword(res, req.user, errFindVisitor, null, false);
					}
				});
			}
		} else {
			Staff.findOne({resetPassCode: req.body['resetCode']}, function (errStaff, staff_member) {
				if (!errStaff) {
					if (staff_member) {
						let updates = {
							$set: {
								password: staff_member.hashPassword(req.body['newPass']),
								permission: 0,
								reset_code: null
							}
						};

						Staff.updateOne({_id: req.body.ID}, updates, {runValidators: true}, function (err, update) {
							if (!err && update) {
								renderChangePassword(res, req.user, null, "Successfully changed password!");
							} else {
								let error = !update ? "User not found!" : validationErr(err);

								renderChangePassword(res, req.user, error, null);
							}
						});
					} else {
						Visitor.findOne({reset_code: req.body['resetCode']}, function (errVisitor, visitor) {
							if (!errVisitor) {
								if (visitor) {
									let updates = {
										$set: {
											password: visitor.hashPassword(req.body['newPass']),
											permission: 1,
											reset_code: null
										}
									};

									Visitor.updateOne({_id: req.body.ID}, updates, {runValidators: true}, function (err, update) {
										if (!err && update) {
											renderChangePassword(res, req.user, null, "Successfully changed password!");
										} else {
											let error = !update ? "User not found!" : validationErr(err);

											renderChangePassword(res, req.user, error, null);
										}
									});
								} else {
									console.log(errVisitor);
									res.redirect('/login');
								}
							} else {
								console.log(errVisitor);
								res.redirect('/login');
							}
						});
					}
				} else {
					console.log(errStaff);
					res.redirect('/login');
				}
			});
		}
	} else {
		res.redirect('/login');
	}
});

router.get('/forgot-password', function (req, res) {
	if (!req.user) {
		renderForgotPassword(res, req, null, null);
	} else {
		res.redirect('/');
	}
});

router.get('/forgot-password', function (req, res) {
	if (!req.user) {
		if (req.body.username) {
			let reset_code = uuidv4();

			Staff.findOne({email: req.body.username}, function (errStaff, staff_member) {
				if (!errStaff) {
					if (staff_member) {
						Staff.updateOne({_id: staff_member._id}, {$set: {resetPassCode: reset_code}}, function (errUpdateStaff, staffUpdatedDoc) {
							if (!errUpdateStaff) {
								console.log(errUpdateStaff);
								renderForgotPassword(res, req, "Unknown error occurred please try again.", null);
							} else {
								genFunctions.sendEmail(req.body.username,null,null, reset_code, req, "forgot-pass");
								renderForgotPassword(res, req, null, "We have sent a reset link to your email, please follow the instructions in the email.");
							}
						});
					} else {
						Visitor.findOne({contactEmail: req.body.username}, function (errVisitor, visitor) {
							if (!errVisitor) {
								Visitor.updateOne({_id: visitor._id}, {$set: {resetPassCode: reset_code}}, function (errUpdateVisitor, visitorUpdatedDoc) {
									if (!errUpdateVisitor) {
										if (visitorUpdatedDoc) {
											genFunctions.sendEmail(req.body.username,null,null, reset_code, req, "forgot-pass");
											renderForgotPassword(res, req, null, "We have sent a reset link to your email, please follow the instructions in the email.");
										} else {
											renderForgotPassword(res, req, "User not found..", null);
										}
									} else {
										console.log(errUpdateVisitor);
										renderForgotPassword(res, req, "Unknown error occurred please try again.", null);
									}
								});
							} else {
								console.log(errVisitor);
								renderForgotPassword(res, req, "Unknown error occurred please try again.", null);
							}
						});
					}
				} else {
					console.log(errStaff);
					renderForgotPassword(res, req, "Unknown error occurred please try again.", null);
				}
			});
		} else {
			renderForgotPassword(res, req, "Please enter e-mail", null);
		}
	} else {
		res.redirect('/');
	}
});

/* Logout */
router.get("/logout", function (req, res) {
	if (req.user) {
		req.logout();
		res.redirect('/');
	} else {
		res.redirect('/');
	}
});
/* End Logout */

router.post('/subscribe', function (req, res) {
	if (req.user && req.user.permission >= 0) {
		if (req.body.subscription) {
			const subscription = req.body.subscription;

			SubNotification.findOne({userID: req.user._id}, function (errFind, subNotif) {
				if (!errFind) {
					if (subNotif) {
						let updates = {
							$set: {
								notification: {
									endpoint: subscription.endpoint,
									expirationTime: subscription.expirationTime,
									keys: {
										p256dh: subscription.keys.p256dh,
										auth: subscription.keys.auth
									}
								}
							}
						};

						SubNotification.updateOne({userID: req.user._id}, updates, function (errUpdate, updateDoc) {
							if (errUpdate) {
								console.log(errUpdate);
								res.status(500).json({message: "Unable to update subscription to notifications."});
							} else {
								res.status(200).json({message: "Successfully subscribed for notifications."});
							}
						});
					} else {
						var new_subscription = new SubNotification({
							userID: req.user._id,
							notification: {
								endpoint: subscription.endpoint,
								expirationTime: subscription.expirationTime,
								keys: {
									p256dh: subscription.keys.p256dh,
									auth: subscription.keys.auth
								}
							}
						});

						new_subscription.save(function (errSave, subDoc) {
							if (errSave) {
								console.log(errSave);
								res.status(500).json({message: "Unable to subscribe for notifications."});
							} else {
								res.status(200);
							}
						})
					}
				} else {
					console.log(errFind);
					res.status(500).json({message: "Unable to subscribe for notifications."});
				}
			});
		} else {
			console.log("Subscription not sent.");
			res.status(500).json({message: "Unable to subscribe for notifications."});
		}
	} else {
		res.status(500).json({message: "Permission for notifications is not granted."});
	}
});

router.post('/filter', function (req, res) {
	/* Filter functions */
	function getVisitorInfo(visitors) {
		return new Promise((resolve) => {
			let visitors_ids_arr = [];

			if(visitors) {
				visitors.forEach((visitor) => {
					visitors_ids_arr.push(mongoose.Types.ObjectId(visitor.visitorID))
				});

				Visitor.find({_id: {$in: visitors_ids_arr}}, function (err, visitorsDoc) {
					if (!err) {
						resolve(visitorsDoc);
					} else {
						resolve([]);
						console.log(err);
					}
				});
			} else {
				resolve([]);
			}
		});
	}

	function getRoomInfo(event_rooms) {
		return new Promise((resolve) => {
			let event_room_ids_arr = [];

			if(event_rooms) {
				event_rooms.forEach((event_room) => {
					event_room_ids_arr.push(event_room.equipID);
				});

				Room.find({_id: {$in: event_room_ids_arr}}, function (err, rooms) {
					if (!err) {
						resolve(rooms);
					} else {
						resolve([]);
						console.log(err);
					}
				});
			} else {
				resolve([]);
			}
		});
	}

	function filterEvent(event) {
		return new Promise(async function (resolve, reject) {
			let result = true;
			let visitors = await getVisitorInfo(event.visitors);
			let rooms = await getRoomInfo(event.rooms);
			let numberOfVisitors = 0;
			let numberOfSpaces = 0;

			Promise.all([visitors, rooms]).then(function () {
				rooms.forEach(function (room) {
					numberOfSpaces = numberOfSpaces + room.capacity;
				});

				visitors.forEach(function (visitor) {
					visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : "";
				});

				if (req.body.spacesMin && req.body.spacesMin > numberOfSpaces) {
					result = false;
				}
				if (req.body.spacesMax && req.body.spacesMax < numberOfSpaces) {
					result = false;
				}
				if (req.body.visitorsMin && req.body.visitorsMin > numberOfVisitors) {
					result = false;
				}
				if (req.body.visitorsMax && req.body.visitorsMax < numberOfVisitors) {
					result = false;
				}

				if (req.body.dateFrom && event.date) {
					let dateFrom = Date.parse(req.body.dateFrom);
					let date = Date.parse(event.date);

					if (dateFrom > date) result = false;
				}
				if (req.body.dateTo && event.date) {
					let dateTo = Date.parse(req.body.dateTo);
					let date = Date.parse(event.date);

					if (dateTo < date) result = false;
				}
				if (req.body.eventTypeSelected && req.body.eventTypeSelected !== 'Select Event Type' && req.body.eventTypeSelected !== event.eventTypeID) {
					result = false;
				}

				resolve(result);
			}).catch(function (err) {
				console.log(err);
				resolve(false);
			});
		});
	}

	function filterEventAdmin(list_element) {
		return new Promise(function (resolve) {
			Event.findOne({_id: list_element.id}, null, {sort:{date:-1}}, async function (errFind, event) {
				if (!errFind) {
					filterEvent(event).then(function (result) {
						resolve(result);
					})
				} else {
					resolve(false);
				}
			});
		});
	}

	function filterEventArchive(list_element) {
		return new Promise(function (resolve) {
			Archive.findOne({_id: list_element.id}, null, {sort:{date:-1}}, async function (errFind, event) {
				if (!errFind) {
					filterEvent(event).then(function (result) {
						resolve(result);
					})
				} else {
					resolve(false);
				}
			});
		});
	}

	function filterEventParticipant(list_element) {
		return new Promise(function (resolve) {
			Event.findOne({_id: list_element.id}, null, {sort:{date:-1}}, async function (errFind, event) {
				let participant = false;

				if (req.user.permission >= 10) {
					event.staffChosen.forEach(function (staff_member) {
						if (staff_member.staffMemberID === req.user._id) participant = true;
					});
				} else if (req.user.permission === 1) {
					event.visitors.forEach(function (visitor) {
						if (visitor.visitorID === req.user._id) participant = true;
					});
				}

				if (participant) {
					filterEvent(event).then(function (result) {
						resolve(result);
					});
				} else {
					resolve(false);
				}
			});
		});
	}
	/* End Filter functions */

	if (req.user && req.user.permission >= 1) {
		if (req.body.type && req.body.type !== "undefined" && req.body.list && req.body.list !== "undefined") {
			let list = [];
			let filterList = [];
			let promises = [];

			switch (req.body.type) {
				case "allList": case "archive":
					if (req.body.list && req.body.originalList && req.user.permission >= 10) {
						req.body.list.forEach(async function (list_element) {
							let function_name = req.body.type === "allList" ? filterEventAdmin(list_element) : filterEventArchive(list_element);
							promises.push(new Promise(function (resolve) {
								function_name.then(function (result) {
									if (result) {
										list.push(list_element);
									}

									resolve();
								});
							}));
						});

						req.body.originalList.forEach(async function (list_element) {
							let function_name = req.body.type === "allList" ? filterEventAdmin(list_element) : filterEventArchive(list_element);
							promises.push(new Promise(function (resolve) {
								function_name.then(function (result) {
									if (result) {
										filterList.push(list_element);
									}

									resolve();
								});
							}));
						});

						if (promises.length > 0) {
							Promise.all(promises).then(function () {
								res.status(200).json({list: list,filterList: filterList});
							});
						} else {
							res.status(200).json({list: [],filterList: []});
						}
					} else {
						res.status(200).json({list: [],filterList: []});
					}
					break;
				case "participate":
					if (req.body.list && req.body.originalList && req.user.permission >= 1) {
						req.body.list.forEach(function (list_element) {
							promises.push(new Promise(function (resolve) {
								filterEventParticipant(list_element).then(function (result) {
									if (result) {
										list.push(list_element);
									}

									resolve();
								});
							}));
						});

						req.body.originalList.forEach(async function (list_element) {
							promises.push(new Promise(function (resolve) {
								filterEventParticipant(list_element).then(function (result) {
									if (result) {
										filterList.push(list_element);
									}

									resolve();
								});
							}));
						});

						if (promises.length > 0) {
							Promise.all(promises).then(function () {
								res.status(200).json({list: list,filterList: filterList});
							});
						} else {
							res.status(200).json({list: [],filterList: []});
						}
					} else {
						res.status(200).json({list: [],filterList: []});
					}
					break;
				case "staff":
					if(req.body.list && req.body.originalList && req.user.permission >= 10){
						function filterStaff(list_result,listToFilter){
							listToFilter.forEach(function(list_element){
								promises.push(new Promise(function (resolve) {
									Staff.findOne({_id: list_element.id}, async function (errFind, staff_member) {
										if(errFind) console.log(errFind);

										if((req.body.staffRole && req.body.staffRole === 'Select Staff Role') ||
											(req.body.staffRole && staff_member.role.includes(req.body.staffRole))){
											list_result.push({
												id:staff_member._id,
												name: staff_member.fullName,
												email: staff_member.email
											});
										}

										resolve();
									});
								}));
							});
						}


						filterStaff(list,req.body.list);
						filterStaff(filterList,req.body.originalList);

						if (promises.length > 0) {
							Promise.all(promises).then(function () {
								res.status(200).json({list: list,filterList: filterList});
							});
						} else {
							res.status(200).json({list: [],filterList: []});
						}
					} else {
						res.status(200).json({list: [],filterList: []});
					}
					break;
			}
		} else {
			res.status(500).json({message: ""});
		}
	} else {
		res.status(500).json({message: "Not authenticated"});
	}
});

router.get('/calendar', function (req, res) {
	function getAllArchiveEvents(){
		return new Promise(function (resolve) {
			Archive.find({}, function (errFind, eventsDoc) {
				if (!errFind) {
					let events = [];
					eventsDoc.forEach(function (event) {
						let participant = false;

						if(req.user.permission >= 10) {
							event.staffChosen.forEach(function (staff_member) {
								if (staff_member.staffMemberID.toString() === req.user._id.toString()) participant = true;
							});
						} else {
							event.visitors.forEach(function (visitor) {
								if (visitor.visitorID.toString() === req.user._id.toString()) participant = true;
							});
						}

						if(participant || req.user.permission >= 10) {
							events.push({
								title: event.eventName,
								start: event.date,
								end: event.endDate,
								url: '/events/view-archive-event?id=' + event._id,
								backgroundColor: "#8a8a8a"
							});
						}
					});
					resolve(events);
				} else {
					console.log(errFind);
					resolve([]);
				}
			});
		});
	}

	function getAllEvents() {
		return new Promise(function (resolve) {
			Event.find({}, function (errFind, eventsDoc) {
				if (!errFind) {
					let events = [];
					eventsDoc.forEach(function (event) {
						let participant = false;

						if(req.user.permission >= 10) {
							event.staffChosen.forEach(function (staff_member) {
								if (staff_member.staffMemberID.toString() === req.user._id.toString()) participant = true;
							});
						} else {
							event.visitors.forEach(function (visitor) {
								if (visitor.visitorID.toString() === req.user._id.toString()) participant = true;
							});
						}

						events.push({
							title: event.eventName,
							start: event.date,
							end: event.endDate,
							url: '/events/view-event?id=' + event._id,
							backgroundColor: participant ? "#ff0000" : "#007bff"
						});
					});
					resolve(events);
				} else {
					console.log(errFind);
					resolve([]);
				}
			});
		});
	}

	if (req.user && req.user.permission >= 1) {
		let promises = [];

		promises.push(getAllArchiveEvents());
		promises.push(getAllEvents());

		Promise.all(promises).then(function (result) {
			res.render('calendar', {
				title: "Calendar",
				events: result,
				user: req.user
			});
		});
	} else {
		res.redirect('/login');
	}
});

router.get('/export', function (req, res, next) {
	if (req.user && req.user.permission >= 30) {
		let export_options = ['Events', 'Equipment', 'Staff', 'Rooms', 'Visitors', 'Еvent Types'];

		if (req.query.type) {
			let json_array = [];
			let fileName = 'error';
			let fields = [];
			let today = new Date();
			let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();

			new Promise(function (resolve) {
				switch (req.query.type) {
					case export_options[0]:
						Event.find({}, async function (errFindEvents, eventDoc) {
							if (!errFindEvents) {
								await Promise.all(eventDoc.map(async function (event) {
									let event_type = await genFunctions.getEventType(event.eventTypeID);
									let rooms = await genFunctions.getRoomInfo(event.rooms);
									let visitors = await genFunctions.getVisitorInfo(event.visitors);

									Promise.all([event_type, visitors, rooms]).then(function () {
										let numberOfSpaces = 0;
										let numberOfVisitors = 0;

										rooms.forEach(function (room) {
											numberOfSpaces = numberOfSpaces + room.capacity;
										});

										visitors.forEach(function (visitor) {
											visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : "";
										});

										json_array.push({
											ID: event._id,
											Name: event.eventName,
											'Event Type': event_type.eventTypeName,
											'Event Spaces': numberOfSpaces,
											'Number of Visitors': numberOfVisitors,
											Date: event.date,
											'End Date': event.endDate,
											Location: event.location
										});
									});
								}));
							} else {
								console.log(errFindEvents);
							}

							fields = ['ID', 'Name', 'Event Type', 'Event Spaces', 'Number of Visitors', 'Date', 'End Date', 'Location'];
							fileName = 'events' + date;
							resolve();
						});
						break;
					case export_options[1]:
						genFunctions.getAllEquipment().then(function (eqDoc) {
							fields = ['ID', 'Name', 'Quantity'];

							eqDoc.forEach(function (equip) {
								let eq_object = {
									ID: equip._id,
									Name: equip.typeName,
									Quantity: equip.quantity
								};

								equip.customFields.forEach(function (field) {
									eq_object[field.fieldName] = fieldValue

									if (!fields.includes(field.fieldName)) {
										fields.push(field.fieldName);
									}
								});

								json_array.push(eq_object);
							});
						});

						fileName = 'equipment' + date;
						resolve();
						break;
					case export_options[2]:
						genFunctions.getAllStaff().then(function (staffDoc) {
							staffDoc.forEach(function (staff_member) {
								json_array.push({
									'Full Name': staff_member.fullName,
									Email: staff_member.email,
									Phone: staff_member.phone,
									Role: staff_member.role
								});
							});
						});

						fields = ['Full Name', 'Email', 'Phone', 'Role'];
						fileName = 'staff' + date;
						resolve();
						break;
					case export_options[3]:
						genFunctions.getAllRooms().then(function (roomsDoc) {
							fields = ['ID', 'Name', 'Quantity'];

							roomsDoc.forEach(function (room) {
								let room_object = {
									ID: room._id,
									Name: room.roomName,
									Capacity: room.capacity
								};

								room.customFields.forEach(function (field) {
									room_object[field.fieldName] = fieldValue

									if (!fields.includes(field.fieldName)) {
										fields.push(field.fieldName);
									}
								});

								json_array.push(room_object);
							});
						});

						fileName = 'rooms' + date;
						resolve();
						break;
					case export_options[4]:
						genFunctions.getAllVisitor().then(function (visitorDoc) {
							fields = ['ID', 'Lead Teacher Name', 'Contact Email', 'Contact Phone', 'Group Size'];

							visitorDoc.forEach(function (visitor) {
								json_array.push({
									ID: visitor._id,
									'Lead Teacher Name': visitor.leadTeacherName,
									'Contact Email': visitor.contactEmail,
									'Contact Phone': visitor.contactPhone,
									'Group Size': visitor.groupSize
								});
							});

							fileName = 'visitors' + date;
							resolve();
						});
						break;
					case export_options[5]:
						genFunctions.getAllEventTypes().then(function (eventTypesDoc) {

							eventTypesDoc.forEach(function (type) {
								let eventType_object = {
									ID: type._id,
									Name: type.eventTypeName
								};

								type.customFields.forEach(function (field) {
									eventType_object[field.fieldName] = fieldValue

									if (!fields.includes(field.fieldName)) {
										fields.push(field.fieldName);
									}
								});

								json_array.push(eventType_object);
							});


							fileName = 'eventTypes' + date;
							resolve();
						});
						break;
					default:
						resolve();
						break;
				}
			}).then(function () {
				if (json_array.length > 0) {
					let csv = json2csv(json_array, fields);

					res.setHeader('Content-disposition', 'attachment; filename=' + fileName + '.csv');
					res.set('Content-Type', 'text/csv');
					res.status(200).send(csv);
				} else {
					res.status(500).json({message: "Unable to process request, please try again."});
				}
			});
		} else {
			res.render('export', {
				title: "Export",
				exportOptions: export_options,
				text: "Your download will start in a few seconds. Please be patient.",
				user: req.user
			});
		}
	} else {
		res.status(500).json({message: "Unable to process request, please try again."});
	}
});

module.exports = router;
