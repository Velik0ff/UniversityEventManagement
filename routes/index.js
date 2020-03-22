const express = require('express');
const router = express.Router();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy; /* this should be after passport*/
const nodemailer = require('nodemailer');
const uuid = require('uuid');
const webpush = require('web-push');
const process = require('process');
const mongoose = require('mongoose');

/* Models */
const Room = require('../models/Room');
const Event = require('../models/Event');
const Staff = require('../models/staff_user');
const Visitor = require('../models/visitor_user');
const SubNotification = require('../models/SubNotification');
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
	var error_msg = "";

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
	var fields = [{name: "Email", type: "email", identifier: "username"},
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
	var fields = [];

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

async function sendForgotPassEmail(email, reset_code, req) {
	// Generate test SMTP service account from ethereal.email
	// Only needed if you don't have a real mail account for testing
	let testAccount = await nodemailer.createTestAccount();

	// create reusable transporter object using the default SMTP transport
	let transporter = nodemailer.createTransport({
		// host: "smtp.mailgun.org",
		host: "smtp.ethereal.email",
		port: 587,
		secure: false, // true for 465, false for other ports
		auth: {
			user: testAccount.user,
			pass: testAccount.pass
			// user: 'postmaster@sandbox93442b8153754117ada8172d0ef1129f.mailgun.org', // generated ethereal user
			// pass: 'd6b25d3e7711da468290a08b2c1db517-074fa10c-7dd01f0c' // generated ethereal password
		}
	});

	let link = req.protocol + '://' + req.get('host') + '/change-password?reset_code=' + reset_code;

	// send mail with defined transport object
	let info = await transporter.sendMail({
		from: '"University of Liverpool Event System" <no-reply@uol-events.co.uk>', // sender address
		to: email, // list of receivers
		subject: "Reset Password", // Subject line
		html: "Hello,</br></br>" +
			"Your password reset link is:</br>" +
			"<a href='" + link + "'>" + link + "</a></br>" +
			"<b>If you have not requested this email, please ignore it.</b>" +
			"<p>" +
			"Best regards,</br>" +
			"UOL Computer Science outreach staff." +
			"</p>"
	});

	console.log("Message sent: %s", info.messageId);
	// Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

	// Preview only available when sending through an Ethereal account
	console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
	// Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

/* End Functions */

/* GET login page. */
router.get('/', function (req, res, next) {
	if (req.user && req.user.permission < 0) {
		res.redirect('/change-password');
	} else if (req.user) {
		res.redirect('/welcome');
	} else {
		renderLogin(res, req, null, null, null);
	}
});

router.get('/welcome', function (req, res, next) {
	res.render('index', {
		title: "University of Liverpool Outreach Events",
		user: req.user,
		publicKey: process.env.PUBLIC_VAPID_KEY
	});
});

router.post('/authorize', function (req, res, next) {
	passport.authenticate('local', function (err, user, info) {
		if (err) { // error has occured
			console.log(err);
			renderLogin(res, req, req.body.username, "Unknown error has occurred", null);
		}
		if (!user) { // authentication failed
			console.log(user)
			renderLogin(res, req, req.body.username, "Credentials are not valid", null);
		}
		req.logIn(user, function (err) {
			if (err) { // error has occured
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

router.get('/change-password', function (req, res, next) {
	if (req.user) {
		renderChangePassword(res, req.user, null, null, false);
	} else if (req.query.reset_code) {
		Staff.findOne({reset_code: req.query.reset_code}, function (errStaff, staff_member) {
			if (!errStaff) {
				if (staff_member) {
					renderChangePassword(res, staff_member, null, null, true);
				} else {
					Visitor.findOne({reset_code: req.query.reset_code}, function (errVisitor, visitor) {
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

router.post('/change-password', function (req, res, next) {
	if (req.user) {
		var Entity = null;
		var permission = req.user.permission;

		if (!req.body.resetCode) {
			if (req.user.permission === -1 || req.user.permission === 0) {
				Staff.findOne({email: req.user.username}, function (errFindStaff, staff_member) {
					if (!errFindStaff) {
						if (staff_member) {
							if (staff_member.comparePassword(req.body.oldPass)) {
								let updates = {$set: {password: staff_member.hashPassword(req.body.newPass), permission: 0}};
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
							if (visitor.comparePassword(req.body.oldPass)) {
								let updates = {$set: {password: visitor.hashPassword(req.body.newPass), permission: 1}};
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
			Staff.findOne({reset_code: req.body.resetCode}, function (errStaff, staff_member) {
				if (!errStaff) {
					if (staff_member) {
						let updates = {
							$set: {
								password: staff_member.hashPassword(req.body.newPass),
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
						Visitor.findOne({reset_code: req.body.resetCode}, function (errVisitor, visitor) {
							if (!errVisitor) {
								if (visitor) {
									let updates = {
										$set: {
											password: visitor.hashPassword(req.body.newPass),
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

router.get('/forgot-password', function (req, res, next) {
	if (!req.user) {
		renderForgotPassword(res, req, null, null);
	} else {
		res.redirect('/');
	}
});

router.get('/forgot-password', function (req, res, next) {
	if (!req.user) {
		if (req.body.username) {
			let reset_code = uuidv4();

			Staff.findOne({email: req.body.username}, function (errStaff, staff_member) {
				if (!errStaff) {
					if (staff_member) {
						Staff.updateOne({_id: staff_member._id}, {$set: {reset_code: reset_code}}, function (errUpdateStaff, staffUpdatedDoc) {
							if (!errUpdateStaff) {
								console.log(errUpdateStaff);
								renderForgotPassword(res, req, "Unknown error occurred please try again.", null);
							} else {
								sendForgotPassEmail(req.body.username, reset_code, req);
								renderForgotPassword(res, req, null, "We have sent a reset link to your email, please follow the instructions in the email.");
							}
						});
					} else {
						Visitor.findOne({contactEmail: req.body.username}, function (errVisitor, visitor) {
							if (!errVisitor) {
								Visitor.updateOne({_id: visitor._id}, {$set: {reset_code: reset_code}}, function (errUpdateVisitor, visitorUpdatedDoc) {
									if (!errUpdateVisitor) {
										if (visitorUpdatedDoc) {
											sendForgotPassEmail(req.body.username, reset_code, req);
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

router.post('/subscribe', (req, res) => {
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
								res.status(200);
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
		}
	} else {
		res.status(500).json({message: "Permission for notifications is not granted."});
	}
});

router.post('/filter', function (req, res, next) {
	/* Filter functions */
	function getVisitorInfo(visitors) {
		return new Promise((resolve, reject) => {
			var visitors_ids_arr = [];

			visitors.forEach((visitor) => {
				visitors_ids_arr.push(mongoose.Types.ObjectId(visitor.visitorID))
			});

			Visitor.find({_id: {$in: visitors_ids_arr}}, function (err, visitorsDoc) {
				if (!err) {
					resolve(visitorsDoc);
				} else {
					resolve(visitorsDoc);
					console.log(err);
				}
			});
		});
	}

	function getRoomInfo(event_rooms) {
		return new Promise((resolve, reject) => {
			var event_room_ids_arr = [];

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
		});
	}

	async function filterEvent(event) {
		var result = true;
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

			if (req.body.spacesMin && !req.body.spacesMin <= numberOfSpaces) {
				result = false;
			}
			if (req.body.spacesMax && !req.body.spacesMax >= numberOfSpaces) {
				result = false;
			}
			if (req.body.visitorsMin && !req.body.visitorsMin <= numberOfVisitors) {
				result = false;
			}
			if (req.body.visitorsMax && !req.body.visitorsMax >= numberOfVisitors) {
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

				if (dateTo > date) result = false;
			}

			return result;
		}).catch(function (err) {
			console.log(err);
			return false;
		});
	}

	function filterEventAdmin(list_element) {
		return new Promise(function (resolve, reject) {
			Event.findOne({_id: list_element.id}, async function (errFind, event) {
				if (!errFind) {

				} else {
					resolve(false);
				}
			});
		});
	}

	function filterEventParticipant(list_element) {
		return new Promise(function (resolve, reject) {
			Event.findOne({_id: list_element.id}, async function (errFind, event) {
				var participant = false;

				if (req.user.permission === 0) {
					event.staffChosen.forEach(function (staff_member) {
						if (staff_member.staffID === req.user._id) participant = true;
					});
				} else if (req.user.permission === 1) {
					event.visitors.forEach(function (visitor) {
						if (visitor.visitorID === req.user._id) participant = true;
					});
				}

				if (participant) {

				} else {
					resolve(false);
				}
			});
		});
	}

	/* End Filter functions */


	if (req.user && req.user.permission >= 0) {
		if (req.body.type && req.body.type !== "undefined" && req.body.list && req.body.list !== "undefined") {
			switch (req.body.type) {
				case "allList":
					if (req.body.list && req.user.permission === 0) {
						var list = [];
						var promises = [];

						req.body.list.forEach(function (list_element) {
							promises.push(new Promise(function (resolve, reject) {
								filterEventAdmin(list_element).then(function (result) {
									if (result) {
										list.push(list_element);
										resolve();
									} else resolve();
								});
							}));
						});

						if (promises.length > 0) {
							Promise.all(promises).then(function () {
								res.status(200).json({list: list});
							});
						} else {
							res.status(200).json({list: []});
						}
					} else {
						res.status(200).json({list: []});
					}
					break;
				case "participate":

					break;
			}
		} else {
			res.status(500).json({message: ""});
		}
	} else {
		res.status(500).json({message: "Not authenticated"});
	}
});

// router.post("/fix-pass",function(req, res){
//   Staff.findOne({email:req.body.username},function(err, staff){
//     Staff.updateOne({email:req.body.username}, {$set:{password:staff.hashPassword(staff.password)}}, function(err, update){
//
//     });
//   });
//
// });

module.exports = router;
