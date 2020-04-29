/**
 * Author: Lyuboslav Velikov
 * ID: 201186573
 * University of Liverpool
 * This file is used to handle basic route requests like
 * login, home page, forgot and change password and etc.
 * @type {createApplication} is the main route handler (router)
 */

const express = require('express');
const router = express.Router(); // used for the route requests and results
const passport = require('passport'); // used for authentication of the users
const LocalStrategy = require('passport-local').Strategy; // use the local strategy (can use facebook or google authentication)
const process = require('process'); // used to get the environment variables for NodeJS (stored in variables.env)
const mongoose = require('mongoose'); // used to get the database structure types
const json2csv = require('json2csv').parse; // used to parse json data to CSV files
const genFunctions = require('../functions/generalFunctions'); // general functions used to manipulate and fetch data
const uuid = require('uuid'); // generate unique ids

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
	/**
	 * Used to check if the user exists and validate the password hash
	 * @param username The username that is entered from the user
	 * @param password The password that is entered from the user
	 * @param done The callback function which will be returned with the result of the query
	 */
	function (username, password, done) {
		Staff.findOne({email: username}, function (err, user) { // search for the user in the staff members collection
			if (err) { // error while fetching from database
				return done(err);
			}
			if (user) { // user found in staff member collection
				if (!user.comparePassword(password)) { // check if the password is wrong
					return done(null, false, {message: 'Incorrect password.'});
				}

				return done(null, { // return the user information if password hash matches
					_id: user._id,
					username: user.email,
					permission: user.permission,
					role: user.role
				});
			} else { // user not found in staff member collection
				Visitor.findOne({contactEmail: username}, function (err, visitor) { // search for the user in the visitors collection
					if (err) { // error while fetching from database
						return done(err);
					}
					if (visitor) { // user found in visitor collection
						if (!visitor.comparePassword(password)) { // check if the password is wrong
							return done(null, false, {message: 'Incorrect password.'});
						}

						return done(null, { // return the user information if password hash matches
							_id: visitor._id,
							username: visitor.contactEmail,
							permission: visitor.permission,
							role: null
						});
					} else { // user not found anywhere
						return done(null, false, {message: 'Incorrect username.'});
					}
				});
			}
		});
	}
));

// stores the user id in the session
passport.serializeUser(function (user, done) {
	done(null, user._id);
});

// pulls the user information from the user id stored in the session
passport.deserializeUser(function (id, done) {
	Staff.findOne({_id: id}, function (err, user) { // search for the user in the staff members collection
		if (user) { // check if the user is found in the staff members collection
			done(err, {
				_id: user._id,
				username: user.email,
				permission: user.permission,
				role: user.role
			});
		} else { // user not found in the staff members collection
			Visitor.findOne({_id: id}, function (err, visitor) { // search for the user in the visitors collection
				if (visitor) { // check if the user is found in the visitors collection
					done(err, {
						_id: visitor._id,
						username: visitor.contactEmail,
						permission: visitor.permission
					});
				} else { // user not found
					done(err, visitor);
				}
			});
		}
	});
});

/* Functions */
/**
 * Function for structuring the data returned by MongoDB validation
 * @param error Passing the error so it can be checked what is it actually
 * @returns {string} The error that has to be printed
 */
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

/**
 * Function to validate if the password matches the requirements of
 * 1 lowercase letter, 1 uppercase letter and one number and it must be at least 6 characters long
 * @param password The password that has been entered by the user
 * @returns {boolean} The result occurring when checking if matching the requirements
 */
function validatePassword(password) { // validate password
	const password_regex = /^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*[0-9]))|((?=.*[A-Z])(?=.*[0-9])))(?=.{6,})/;
	return password_regex.test(password);
}

/**
 * Function to render the login screen
 * @param res The result that has to be shown to the user (the template in our case)
 * @param req The request that has been made by the user
 * @param username The username which the user has entered
 * @param error The error message if one has occurred
 * @param message The success message (This is only used if debugging)
 * @returns {*} the resulting render
 */
function renderLogin(res, req, username, error, message) {
	// fields that have to be entered
	let fields = [{name: "Email", type: "email", identifier: "username"},
		{name: "Password", type: "password", identifier: "password"}];

	fields[0].value = username; // assign the value for the field

	/* Render Template */
	return res.render('small', {
		title: "Log in",
		message: message,
		error: error,
		fields: fields,
		submitButton: {title: "Log in"},
		formAction: "/authorize",
		user: req.user
	});
	/* End Render Template */
}

/**
 * Function to render the change password screen
 * @param res The result that has to be shown to the user (the template in our case)
 * @param user The current user that is in the session
 * @param error The error message if one has occurred
 * @param message The success message (if user changes initial password, this will not be seen)
 * @param reset_pass Used when there has been passed a reset password code
 */
function renderChangePassword(res, user, error, message, reset_pass) {
	let fields = []; // fields that have to be entered

	if (!message) { // if there is no success message
		if (!reset_pass) { // check if there is a reset code set (if there is the old password will not be required)
			fields.push({name: "Old Password", type: "password", identifier: "oldPass"});
		} else { // reset code is required
			fields.push({name: "Reset Code", type: "hidden", identifier: "resetCode", value: reset_pass});
		}
		// the new password fields
		fields = fields.concat([{name: "New Password", type: "password", identifier: "newPass"},
			{name: "Confirm Password", type: "password", identifier: "confirmPass"}]);
	}

	/* Render Template */
	res.render('small', {
		title: "Change Password",
		message: message,
		error: error,
		fields: fields,
		submitButton: !message ? {title: "Submit"} : null,
		formAction: !message ? "/change-password" : null,
		linkButton: message ? {title: "Log in", link: '/'} : null,
		user: user
	});
	/* End Render Template */
}

/**
 * Function to render the forgot password screen
 * @param res The result that has to be shown to the user (the template in our case)
 * @param req The request that has been made by the user
 * @param error The error message if one has occurred
 * @param message The success message (if user changes initial password, this will not be seen)
 * @returns {*} The resulting render
 */
function renderForgotPassword(res, req, error, message) {
	let fields = [{name: "E-mail", type: "email", identifier: "username"}]; // fields that have to be entered

	/* Render Template */
	return res.render('small', {
		title: "Forgot Password",
		message: message,
		error: error,
		fields: fields,
		submitButton: {title: "Submit"},
		formAction: "/forgot-password",
		user: req.user
	});
	/* End Render Template */
}

/* End Functions */

/**
 * The login page
 */
router.get('/', function (req, res) {
	if (req.user && req.user.permission < 0) { // check if the user is logged in but he or she has not changed the initial password
		res.redirect('/change-password');
	} else if (req.user) { // check if the user is logged and has necessary permissions
		res.redirect('/welcome');
	} else { // user not logged
		renderLogin(res, req, null, null, null); // render the login page
	}
});

/**
 * The home page
 * This route will also subscribe the user browser to push notifications (thus the public key)
 */
router.get('/welcome', function (req, res) {
	/* Render Template */
	res.render('index', {
		title: "University of Liverpool Outreach Events",
		user: req.user,
		publicKey: process.env.PUBLIC_VAPID_KEY
	});
	/* End Render Template */
});

/**
 * The page which authenticates the user
 */
router.post('/authorize', function (req, res, next) {
	passport.authenticate('local', function (err, user) { // passport to validate the user credentials
		if (err) { // error has occurred
			console.log(err);
			renderLogin(res, req, req.body.username, "Unknown error has occurred", null); // render the login page
		}
		if (!user) { // authentication failed
			renderLogin(res, req, req.body.username, "Credentials are not valid", null); // render the login page
		}
		req.logIn(user, function (err) { // try to login the user
			if (err) { // error has occurred
				console.log(err);
				renderLogin(res, req, req.body.username, "Unknown error has occurred", null); // render the login page
			}

			if (req.user && req.user.permission >= 0) { // user is authenticated and has changed initial password
				res.redirect('/welcome'); // redirect to home page
			} else if (req.user && req.user.permission < 0) { // user is authenticated but has not changed initial password
				res.redirect('/change-password'); // redirect to home page
			}
		});
	})(req, res, next);
});

/**
 * The Change Password route with a GET method is used to
 * display the appropriate fields in the small template
 */
router.get('/change-password', function (req, res) {
	if (req.user) { // check if the user has logged in
		renderChangePassword(res, req.user, null, null, false); // render the change password screen with old password required
	} else if (req.query.reset_code) { // user not logged but reset password code is provided
		Staff.findOne({resetPassCode: req.query.reset_code}, function (errStaff, staff_member) { // search a staff member with the provided reset password code
			if (!errStaff) {
				if (staff_member) { // staff member with the provided reset password code is found
					renderChangePassword(res, staff_member, null, null, req.query.reset_code); // render the change password screen without old password
				} else { // staff member not found with provided reset password code
					Visitor.findOne({resetPassCode: req.query.reset_code}, function (errVisitor, visitor) { // search a visitor with the provided reset password code
						if (!errVisitor) {
							if (visitor) { // staff member with the provided reset password code is found
								renderChangePassword(res, staff_member, null, null, req.query.reset_code); // render the change password screen without old password
							} else { // visitor not found with the provided reset password code
								console.log(errVisitor);
								renderForgotPassword(res, req, 'Code is not longer valid.', null); // render the forgot password screen
							}
						} else { // error while searching for visitor
							console.log(errVisitor);
							renderForgotPassword(res, req, 'Unknown error occurred. Please try again.', null); // render the forgot password screen
						}
					});
				}
			} else { // error while searching for staff member
				console.log(errStaff);
				res.redirect('/');
			}
		});
	} else { // user is not logged in and no reset password code is provided
		res.redirect('/');
	}
});

/**
 * The Change Password route with a POST method is used to
 * handle the request to change the user password
 */
router.post('/change-password', function (req, res) {
	if (!req.body['resetCode'] && req.user) { // check if user is logged in and there is no reset passsword code provided
		if (req.user.permission === -1 || req.user.permission >= 10) { // check if the user is a staff member
			Staff.findOne({_id: req.user._id}, function (errFindStaff, staff_member) { // fetch staff member information from database
				if (!errFindStaff) {
					if (staff_member) { // staff member found in the database
						if (staff_member.comparePassword(req.body['oldPass'])) { // check if the old password field matches with the current password
							if (req.body['newPass'] === req.body['confirmPass']) { // check if the new password field and the confirm password match
								if (validatePassword(req.body['newPass'])) { // check if the new password matches the password requirements
									Role.findOne({roleName: staff_member.role}, function (errFindRole, roleDoc) { // fetch the role information from the database
										let rolePermission = 10; // minimal permission

										if (errFindRole) console.log(errFindRole); // if error has occurred while fetching role information from database

										if (roleDoc) rolePermission = roleDoc.rolePermission; // role permission that has to be assigned to the user

										let updates = { // the updates that have to be done to the staff member
											$set: {
												password: staff_member.hashPassword(req.body['newPass']),
												permission: rolePermission
											}
										};
										let term_permission = req.user.permission; // the old permission of the staff member

										Staff.updateOne({_id: req.user._id}, updates, {runValidators: true}, function (err) { // update the staff member
											if (!err) {
												if (term_permission === -1) { // check if the old permission was for an updated initial password
													res.redirect('/welcome');
												} else { // if it was just for a password update
													renderChangePassword(res, req.user, null, "Successfully changed password!", false); // render the change password screen with old password required
												}
											} else { // error occurred while updating staff member
												console.log(err);

												let error = validationErr(err); // check for if validation error

												renderChangePassword(res, req.user, error, null, false); // render the change password screen with old password required
											}
										});
									});
								} else { // password not meeting the requirements
									let error = "Password must contain 1 lowercase letter, 1 uppercase letter and one number and it must be at least 6 characters long.";

									renderChangePassword(res, req.user, error, null, false); // render the change password screen with old password required
								}
							} else { // new password does not match confirm password
								renderChangePassword(res, req.user, "Passwords do not match.", null, false); // render the change password screen with old password required
							}
						} else { // the current password is not right
							renderChangePassword(res, req.user, "The old password is not right, please try again.", null, false);
						}
					} else { // staff member not found in the database
						renderChangePassword(res, req.user, "User not found!", null, false); // render the change password screen with old password required
					}
				} else { // error while fetching information from database
					console.log(errFindStaff);
					renderChangePassword(res, req.user, errFindStaff, null, false); // render the change password screen with old password required
				}
			});
		} else if (req.user.permission === -2 || req.user.permission === 1) { // check if the user is a visitor
			Visitor.findOne({_id: req.user._id}, function (errFindVisitor, visitor) { // fetch visitor information from database
				if (!errFindVisitor) {
					if (visitor) { // visitor found in the database
						if (visitor.comparePassword(req.body['oldPass'])) { // check if the old password field matches with the current password
							if (req.body['newPass'] === req.body['confirmPass']) { // check if the new password field and the confirm password match
								if (validatePassword(req.body['newPass'])) { // check if the new password matches the password requirements
									let updates = {$set: {password: visitor.hashPassword(req.body['newPass']), permission: 1}}; // the updates that have to be done to the visitor
									let term_permission = req.user.permission; // the old permission of the visitor

									Visitor.updateOne({_id: req.user._id}, updates, {runValidators: true}, function (err) { // update the visitor
										if (!err) {
											if (term_permission === -2) { // check if the old permission was for an updated initial password
												res.redirect('/welcome');
											} else { // if it was just for a password update
												renderChangePassword(res, req.user, null, "Successfully changed password!", false); // render the change password screen with old password required
											}
										} else { // error occurred while updating visitor
											let error = validationErr(err); // check for if validation error

											renderChangePassword(res, req.user, error, null, false); // render the change password screen with old password required
										}
									});
								} else { // password not meeting requirements
									let error = "Password must contain 1 lowercase letter, 1 uppercase letter and one number and it must be at least 6 characters long.";

									renderChangePassword(res, req.user, error, null, false); // render the change password screen with old password required
								}
							} else { // new password does not match confirm password
								renderChangePassword(res, req.user, "Passwords do not match.", null, false); // render the change password screen with old password required
							}
						} else { // the current password is not right
							renderChangePassword(res, req.user, "The old password is not right, please try again.", null, false); // render the change password screen with old password required
						}
					} else { // visitor not found in the database
						renderChangePassword(res, req.user, "User not found!", null, false); // render the change password screen with old password required
					}
				} else { // error while fetching information from database
					console.log(errFindVisitor);
					renderChangePassword(res, req.user, errFindVisitor, null, false); // render the change password screen with old password required
				}
			});
		}
	} else { // reset password code is provided
		Staff.findOne({resetPassCode: req.body['resetCode']}, function (errStaff, staff_member) { // search a staff member with the provided reset password code
			if (!errStaff) {
				if (req.body['newPass'] === req.body['confirmPass']) { // check if the new password and the confirm passwords match
					if (validatePassword(req.body['newPass'])) { // check if the new password meets the requirements
						if (staff_member) { // staff member with the provided code was found
							let updates = { // the updates to the staff member that have to be done
								$set: {
									password: staff_member.hashPassword(req.body['newPass']),
									reset_code: null
								}
							};

							Staff.updateOne({_id: staff_member._id}, updates, {runValidators: true}, function (err) { // update the staff member
								if (!err) {
									renderChangePassword(res, req.user, null, "Successfully changed password!", false); // render the change password screen with old password required
								} else { // error while updating staff member
									console.log(err);

									let error = validationErr(err); // check if validation error

									renderChangePassword(res, req.user, error, null, req.body['resetCode']); // render the change password screen without old password
								}
							});
						} else { // staff member with the provided code was not found
							Visitor.findOne({resetPassCode: req.body['resetCode']}, function (errVisitor, visitor) { // search a visitor with the provided reset password code
								if (!errVisitor) {
									if (visitor) { // visitor with the provided code was found
										let updates = { // the updates to the staff member that have to be done
											$set: {
												password: visitor.hashPassword(req.body['newPass']),
												resetPassCode: null
											}
										};

										Visitor.updateOne({_id: visitor._id}, updates, {runValidators: true}, function (err) { // update the user
											if (!err) {
												renderChangePassword(res, req.user, null, "Successfully changed password!", false); // render the change password screen with old password required
											} else { // error while updating visitor
												console.log(err);

												let error = validationErr(err); // check if validation error

												renderChangePassword(res, req.user, error, null, req.body['resetCode']); // render the change password screen without old password
											}
										});
									} else { // visitor with the provided code was not found
										console.log(errVisitor);
										res.redirect('/');
									}
								} else { // error while fetching data from the database
									console.log(errVisitor);
									res.redirect('/');
								}
							});
						}
					} else { // new password does not meet the requirements
						let error = "Password must contain 1 lowercase letter, 1 uppercase letter and one number and it must be at least 6 characters long.";

						renderChangePassword(res, req.user, error, null, req.body['resetCode']); // render the change password screen without old password
					}
				} else { // new password and confirm password do not match
					renderChangePassword(res, req.user, "Passwords do not match.", null, req.body['resetCode']); // render the change password screen without old password
				}
			} else { // error while fetching data from the database
				console.log(errStaff);
				res.redirect('/');
			}
		});
	}
});

/**
 * The Forgot Password route with a GET method is used to
 * display the appropriate fields in the small template
 */
router.get('/forgot-password', function (req, res) {
	if (!req.user) { // user is not authenticated
		renderForgotPassword(res, req, null, null); // render the forgot password screen
	} else { // user is authenticated
		res.redirect('/');
	}
});

/**
 * The Forgot Password route with a POST method is used to
 * handle the request to reset the user password
 */
router.post('/forgot-password', function (req, res) {
	if (!req.user) { // check if the user is not authenticated
		if (req.body.username) { // check if a username is provided
			let reset_code = uuid.v4(); // generate a unique reset password code

			Staff.findOne({email: req.body.username}, function (errStaff, staff_member) { // search for a staff member with the provided username
				if (!errStaff) {
					if (staff_member) { // staff member found in the database
						Staff.updateOne({_id: staff_member._id}, {$set: {resetPassCode: reset_code}}, function (errUpdateStaff) { // update staff member
							if (errUpdateStaff) { // error while updating staff member
								console.log(errUpdateStaff);

								renderForgotPassword(res, req, "Unknown error occurred please try again.", null); // render the forgot password screen
							} else {
								// send an email with the reset password code to the staff member
								genFunctions.sendEmail(req.body.username, null, null, reset_code, req, "forgot-pass").then().catch();
								renderForgotPassword(res, req, null, "We have sent a reset link to your email, please follow the instructions in the email."); // render the forgot password screen
							}
						});
					} else { // staff member not found
						Visitor.findOne({contactEmail: req.body.username}, function (errVisitor, visitor) { // search for a visitor with the provided username
							if (!errVisitor) {
								if (visitor) { // visitor found in the database
									Visitor.updateOne({_id: visitor._id}, {$set: {resetPassCode: reset_code}}, function (errUpdateVisitor) { // update the visitor
										if (!errUpdateVisitor) {
											// send an email with the reset password code to the visitor
											genFunctions.sendEmail(req.body.username, null, null, reset_code, req, "forgot-pass").then().catch();
											renderForgotPassword(res, req, null, "We have sent a reset link to your email, please follow the instructions in the email."); // render the forgot password screen
										} else { // error while updating visitor
											console.log(errUpdateVisitor);
											renderForgotPassword(res, req, "Unknown error occurred please try again.", null); // render the forgot password screen
										}
									});
								} else { // username not found in the database
									renderForgotPassword(res, req, "User not found", null); // render the forgot password screen
								}
							} else { // error while fetching information from the database
								console.log(errVisitor);
								renderForgotPassword(res, req, "Unknown error occurred please try again.", null); // render the forgot password screen
							}
						});
					}
				} else { // error while fetching information from the database
					console.log(errStaff);
					renderForgotPassword(res, req, "Unknown error occurred please try again.", null); // render the forgot password screen
				}
			});
		} else { // username not provided
			renderForgotPassword(res, req, "Please enter e-mail", null); // render the forgot password screen
		}
	} else { // if user is authenticated
		res.redirect('/');
	}
});

/**
 * Used to log out from the database
 */
router.get("/logout", function (req, res) {
	if (req.user) { // check if the user is logged in
		req.logout(); // logout request
		res.redirect('/');
	} else { // if the user is not logged in
		res.redirect('/');
	}
});

/**
 * The Subscribe route is used to subscribe the user for push notifications
 * The route does not render any templates
 */
router.post('/subscribe', function (req, res) {
	if (req.user && req.user.permission >= 0) { // check if the user has logged in and changed his initial password
		if (req.body.subscription) { // check if there has been a subscription generated
			const subscription = req.body.subscription; // save as a temporary variable

			SubNotification.findOne({userID: req.user._id}, function (errFind, subNotif) { // search for subscriptions for this user
				if (!errFind) {
					if (subNotif) { // existing subscription found
						let updates = { // updates to the current subscription in the database
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

						SubNotification.updateOne({userID: req.user._id}, updates, function (errUpdate) { // update the subscription
							if (errUpdate) { // error while updating subscription
								console.log(errUpdate);
								res.status(500).json({message: "Unable to update subscription to notifications."});
							} else { // updated subscription
								res.status(200).json({message: "Successfully subscribed for notifications."});
							}
						});
					} else { // previous subscription not found
						let new_subscription = new SubNotification({ // create a new subscription object
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

						new_subscription.save(function (errSave) { // insert object into the database
							if (errSave) { // error while inserting into the database
								console.log(errSave);
								res.status(500).json({message: "Unable to subscribe for notifications."});
							} else { // successfully inserted into the database
								res.status(200).json({message: "Successfully subscribed for notifications."});
							}
						})
					}
				} else { // error while searching for subscription for this user
					console.log(errFind);
					res.status(500).json({message: "Unable to subscribe for notifications."});
				}
			});
		} else { // subscription is not generated or passed to this route
			console.log("Subscription not sent.");
			res.status(500).json({message: "Unable to subscribe for notifications."});
		}
	} else { // Insufficient permissions
		res.status(500).json({message: "Permission for notifications is not granted."});
	}
});

/**
 * The filter route is used to apply a filter
 * created by the user to a list that has been passed to this route
 */
router.post('/filter', function (req, res) {
	/* Filter functions */
	/**
	 * Function to decide if the event should be displayed to the user
	 * @param event The event information
	 * @returns {Promise<Boolean>}
	 */
	function filterEvent(event) {
		return new Promise(async function (resolve) { // await to decide because have to fetch some information for the event
			let result = true; // the result which is going to be returned
			let visitors = await genFunctions.getVisitorInfo(event.visitors); // get the visitor information from the database
			let rooms = await genFunctions.getRoomInfo(event.rooms); // get the rooms information from the database
			let numberOfVisitors = 0; // count the number of visitors
			let numberOfSpaces = 0; // count the number of spaces available

			// when all the promises are resolved
			Promise.all([visitors, rooms]).then(function () {
				/* Count the number of spaces available */
				rooms.forEach(function (room) {
					numberOfSpaces = numberOfSpaces + room.capacity;
				});
				/* End Count the number of spaces available */

				/* Count the number of visitors */
				visitors.forEach(function (visitor) {
					visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : "";
				});
				/* End Count the number of visitors */

				if (req.body.spacesMin && req.body.spacesMin > numberOfSpaces) { // check if the spaces are less than the minimum required
					result = false;
				}
				if (req.body.spacesMax && req.body.spacesMax < numberOfSpaces) { // check if the spaces are more than the maximum required
					result = false;
				}
				if (req.body.visitorsMin && req.body.visitorsMin > numberOfVisitors) { // check if the visitors are less than the minimum required
					result = false;
				}
				if (req.body.visitorsMax && req.body.visitorsMax < numberOfVisitors) { // check if the visitors are more than the maximum required
					result = false;
				}

				if (req.body.dateFrom && event.date) { // check if the start date for the event is before the required date
					let dateFrom = Date.parse(req.body.dateFrom);
					let date = Date.parse(event.date);

					if (dateFrom > date) result = false;
				}
				if (req.body.dateTo && event.date) { // check if the start date for the event is after the required date
					let dateTo = Date.parse(req.body.dateTo);
					let date = Date.parse(event.date);

					if (dateTo < date) result = false;
				}

				// check if the event type required matched the event type of the event
				if (req.body.eventTypeSelected && req.body.eventTypeSelected !== 'Select Event Type' && req.body.eventTypeSelected !== event.eventTypeID) {
					result = false;
				}

				resolve(result); // resolve with the result
			}).catch(function (err) { // error occurred while awaiting promises
				console.log(err);
				resolve(false); // resolve with false for this event
			});
		});
	}

	/**
	 * Function to filter all the events of the system.
	 * Only for admins
	 * @param list_element The element to check if it has to be filtered
	 * @returns {Promise<Boolean>}
	 */
	function filterEventAdmin(list_element) {
		return new Promise(function (resolve) { // await to decide because have to fetch some information for the event
			Event.findOne({_id: list_element.id}, null, {sort: {date: -1}}, async function (errFind, event) { // fetch event from the database (used for extra security)
				if (!errFind && event) {
					filterEvent(event).then(function (result) { // filter the event
						resolve(result);
					})
				} else { // error occurred while fetching data from the database or event is not found
					resolve(false);
				}
			});
		});
	}

	/**
	 * Function to filter the archived events of the system.
	 * Only for admins
	 * @param list_element The element to check if it has to be filtered
	 * @returns {Promise<Boolean>}
	 */
	function filterEventArchive(list_element) {
		return new Promise(function (resolve) { // await to decide because have to fetch some information for the event
			Archive.findOne({eventID: list_element.id}, null, {sort: {date: -1}}, async function (errFind, event) { // fetch event from the database (used for extra security)
				if (!errFind && event) {
					/* Filter the archive event */
					let numberOfVisitors = 0; // count the number of visitors
					let numberOfSpaces = 0; // count the number of spaces available
					let result = true; // the result which is going to be returned

					/* Count the number of spaces available */
					event.rooms.forEach(function (room) {
						numberOfSpaces = numberOfSpaces + room.capacity;
					});
					/* End Count the number of spaces available */

					/* Count the number of visitors */
					event.visitors.forEach(function (visitor) {
						visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : "";
					});
					/* End Count the number of visitors */

					if (req.body.spacesMin && req.body.spacesMin > numberOfSpaces) { // check if the spaces are less than the minimum required
						result = false;
					}
					if (req.body.spacesMax && req.body.spacesMax < numberOfSpaces) { // check if the spaces are more than the maximum required
						result = false;
					}
					if (req.body.visitorsMin && req.body.visitorsMin > numberOfVisitors) { // check if the visitors are less than the minimum required
						result = false;
					}
					if (req.body.visitorsMax && req.body.visitorsMax < numberOfVisitors) { // check if the visitors are more than the maximum required
						result = false;
					}

					if (req.body.dateFrom && event.date) { // check if the start date for the event is before the required date
						let dateFrom = Date.parse(req.body.dateFrom);
						let date = Date.parse(event.date);

						if (dateFrom > date) result = false;
					}
					if (req.body.dateTo && event.date) { // check if the start date for the event is after the required date
						let dateTo = Date.parse(req.body.dateTo);
						let date = Date.parse(event.date);

						if (dateTo < date) result = false;
					}

					// check if the event type required matched the event type of the event
					if (req.body.eventTypeSelected && req.body.eventTypeSelected !== 'Select Event Type' && req.body.eventTypeSelected !== event.eventType) {
						result = false;
					}

					resolve(result); // resolve with the result
					/* End Filter the archive event */
				} else { // error occurred while fetching data from the database or event is not found
					resolve(false);
				}
			});
		});
	}

	/**
	 * Filter the events that the user is participating to
	 * @param list_element The element to check if it has to be filtered
	 * @returns {Promise<Boolean>}
	 */
	function filterEventParticipant(list_element) {
		return new Promise(function (resolve) { // await to decide because have to fetch some information for the event
			Event.findOne({_id: list_element.id}, null, {sort: {date: -1}}, async function (errFind, event) { // fetch the event information from the database
				let participant = false; // to check if the user is a participant

				if (req.user.permission >= 10) { // if the user is a staff member
					/* Check if the staff member is chosen for this event to be a participant */
					event.staffChosen.forEach(function (staff_member) {
						if (staff_member.staffMemberID === req.user._id.toString()) participant = true;
					});
					/* End Check if the staff member is chosen for this event to be a participant */
				} else if (req.user.permission === 1) { // if the user is a visitor
					/* Check if the visitor is chosen for this event to be a participant */
					event.visitors.forEach(function (visitor) {
						if (visitor.visitorID === req.user._id.toString()) participant = true;
					});
					/* End Check if the visitor is chosen for this event to be a participant */
				}

				if (participant) { // if the user is a participant
					filterEvent(event).then(function (result) { // filter the event
						resolve(result); // resolve with the result
					});
				} else { // if the user is not a participant
					resolve(false);
				}
			});
		});
	}

	/* End Filter functions */

	if (req.user && req.user.permission >= 1) { // check if the user is logged in and has changed the initial password
		if (req.body.type && req.body.type !== "undefined" && req.body.list && req.body.list !== "undefined") {
			let list = []; // store the resulting list with a search input
			let filterList = []; // store the original list filter without a search input
			let promises = []; // promises that have to be resolved before returning the resulting list

			switch (req.body.type) {
				case "allList":
				case "archive": // filtering for staff member
					// check if the user is input
					// check if the lists are input
					if (req.body.list && req.body.originalList && req.user.permission >= 10) {
						/* Filter with a search input */
						req.body.list.forEach(async function (list_element) { // iterate through the list given with a search possibly
							let function_name = req.body.type === "allList" ? filterEventAdmin(list_element) : filterEventArchive(list_element); // check which function should be used for filtering

							promises.push(new Promise(function (resolve) {
								function_name.then(function (result) {
									if (result) {
										list.push(list_element);
									}

									resolve(); // resolve the filter for this event
								});
							}));
						});
						/* End Filter with a search input */

						/* Filter without a search input */
						// this is used when the user removes the search input, this way the filter is re-applied without posting to this route
						req.body.originalList.forEach(async function (list_element) { // iterate through the list given without a search
							let function_name = req.body.type === "allList" ? filterEventAdmin(list_element) : filterEventArchive(list_element);

							promises.push(new Promise(function (resolve) {
								function_name.then(function (result) {
									if (result) {
										filterList.push(list_element);
									}

									resolve(); // resolve the filter for this event
								});
							}));
						});
						/* End Filter without a search input */

						if (promises.length > 0) { // there is an event awaiting to be resolved with the result
							// when all the promises are resolved
							Promise.all(promises).then(function () {
								res.status(200).json({list: list, filterList: filterList});
							});
						} else { // nothing was sent to this route
							res.status(200).json({list: [], filterList: []});
						}
					} else { // invalid input or user not authenticated
						res.status(200).json({list: [], filterList: []});
					}
					break;
				case "participate": // filtering for all users which are participating a certain event
					if (req.body.list && req.body.originalList && req.user.permission >= 1) {
						/* Filter with a search input */
						req.body.list.forEach(function (list_element) {
							promises.push(new Promise(function (resolve) {
								filterEventParticipant(list_element).then(function (result) {
									if (result) {
										list.push(list_element);
									}

									resolve(); // resolve the filter for this event
								});
							}));
						});
						/* End Filter with a search input */

						/* Filter without a search input */
						// this is used when the user removes the search input, this way the filter is re-applied without posting to this route
						req.body.originalList.forEach(async function (list_element) {
							promises.push(new Promise(function (resolve) {
								filterEventParticipant(list_element).then(function (result) {
									if (result) {
										filterList.push(list_element);
									}

									resolve(); // resolve the filter for this event
								});
							}));
						});
						/* End Filter without a search input */

						if (promises.length > 0) { // there is an event awaiting to be resolved with the result
							// when all the promises are resolved
							Promise.all(promises).then(function () {
								res.status(200).json({list: list, filterList: filterList});
							});
						} else { // nothing was sent to this route
							res.status(200).json({list: [], filterList: []});
						}
					} else { // invalid input or user not authenticated
						res.status(200).json({list: [], filterList: []});
					}
					break;
				case "staff": // filtering staff members
					// check if the user is input
					// check if the lists are input
					if (req.body.list && req.body.originalList && req.user.permission >= 30) {
						/**
						 * Filter the staff members
						 * @param list_result The element to check if it has to be filtered
						 * @param listToFilter The list that has to be filtered
						 */
						function filterStaff(list_result, listToFilter) {
							listToFilter.forEach(function (list_element) { // iterate through all the events to filter
								promises.push(new Promise(function (resolve) {
									Staff.findOne({_id: list_element.id}, async function (errFind, staff_member) { // fetch staff member information from the database
										if (errFind) console.log(errFind); // error while fetching data from the database

										// check if the staff member has the required role
										if ((req.body.staffRole && req.body.staffRole === 'Select Staff Role') ||
											(req.body.staffRole && staff_member.role.includes(req.body.staffRole))) {
											list_result.push({ // push the staff member to the resulting list
												id: staff_member._id,
												name: staff_member.fullName,
												email: staff_member.email
											});
										}

										resolve(); // resolve the filter for this staff member
									});
								}));
							});
						}

						filterStaff(list, req.body.list); // filter staff members with a search input possibly
						filterStaff(filterList, req.body.originalList); // filter staff members without a search input

						if (promises.length > 0) { // there is an event awaiting to be resolved with the result
							// when all the promises are resolved
							Promise.all(promises).then(function () {
								res.status(200).json({list: list, filterList: filterList});
							});
						} else { // nothing was sent to this route
							res.status(200).json({list: [], filterList: []});
						}
					} else { // invalid input or user is not authenticated
						res.status(200).json({list: [], filterList: []});
					}
					break;
			}
		} else { // invalid input passed to this route
			res.status(500).json({message: ""});
		}
	} else { // Insufficient permissions
		res.status(500).json({message: "Not authenticated"});
	}
});

/**
 * The Calendar route is used to render the calendar and display
 * the events that the requesting user can see
 */
router.get('/calendar', async function (req, res) {
	/**
	 * This function displays all the archive events that the requesting user can see
	 * @returns {Promise<Array>}
	 */
	function getAllArchiveEvents() {
		return new Promise(function (resolve) {
			Archive.find({}, function (errFind, eventsDoc) { // fetch all archive events from the database
				if (!errFind) {
					let events = []; // store the events here
					eventsDoc.forEach(function (event) { // iterate through the result that the database returned
						let participant = false; // used to check if the user is a participant

						if (req.user.permission >= 10) { // check if the user is a staff member
							event.staffChosen.forEach(function (staff_member) {
								// if the ids match here, then the staff member is a participant
								if (staff_member.staffMemberID && staff_member.staffMemberID.toString() === req.user._id.toString()) participant = true;
							});
						} else { // the user is a visitor
							event.visitors.forEach(function (visitor) {
								// if the ids match here, then the visitor is a participant
								if (visitor.visitorID && visitor.visitorID.toString() === req.user._id.toString()) participant = true;
							});
						}

						if (participant || req.user.permission >= 10) { // check if the user is a staff member or a participant to the event
							events.push({ // add the event to the array to be displayed on the calendar
								title: event.eventName,
								start: event.date,
								end: event.endDate,
								url: '/events/archive/view-archive-event?id=' + event.eventID,
								backgroundColor: "#8a8a8a"
							});
						}
					});
					resolve(events); // return the events array
				} else { // error while fetching data from the database
					console.log(errFind);
					resolve([]);
				}
			});
		});
	}

	/**
	 * This function displays all the events that the requesting user can see
	 * @returns {Promise<Array>}
	 */
	function getAllEvents() {
		return new Promise(function (resolve) {
			Event.find({}, function (errFind, eventsDoc) { // fetch all events from t he database
				if (!errFind) {
					let events = []; // store the events here
					eventsDoc.forEach(function (event) { // iterate through the result that the database returned
						let participant = false; // used to check if the user is a participant

						if (req.user.permission >= 10) { // check if the user is a staff member
							event.staffChosen.forEach(function (staff_member) {
								// if the ids match here, then the staff member is a participant
								if (staff_member.staffMemberID.toString() === req.user._id.toString()) participant = true;
							});
						} else { // the user is a visitor
							event.visitors.forEach(function (visitor) {
								// if the ids match here, then the visitor is a participant
								if (visitor.visitorID.toString() === req.user._id.toString()) participant = true;
							});
						}

						if (participant || req.user.permission >= 10) { // check if the user is a staff member or a participant to the event
							// different background color is used for events that the user participates
							events.push({ // add the event to the array to be displayed on the calendar
								title: event.eventName,
								start: event.date,
								end: event.endDate,
								url: '/events/view-event?id=' + event._id,
								backgroundColor: participant ? "#ff0000" : "#007bff"
							});
						}
					});
					resolve(events); // return the events array
				} else { // error while fetching data from the database
					console.log(errFind);
					resolve([]);
				}
			});
		});
	}

	if (req.user && req.user.permission >= 1) { // check if the user has permissions to see this screen
		let archive_events = await getAllArchiveEvents(); // get all the archived events that the user can see
		let all_active_events = await getAllEvents(); // get all the events that the user can see

		// when all promises are resolved
		Promise.all([archive_events, all_active_events]).then(function () {
			let events = archive_events.concat(all_active_events); // concatenate both archive and active events

			/* Render Template */
			res.render('calendar', {
				title: "Calendar",
				events: events,
				user: req.user
			});
			/* End Render Template */
		});
	} else { // Insufficient permissions
		res.redirect('/');
	}
});

/**
 * The Export route is used to return different data stored into the database into CSV files
 */
router.get('/export', function (req, res) {
	if (req.user && req.user.permission >= 1) { // check if the user is a staff member
		let export_options = ['Events', 'Archive Events', 'Equipment', 'Staff', 'Rooms', 'Visitors', 'Event Types'];

		if (req.query.type) { // check if type is selected
			let json_array = []; // the array which will store all the json data
			let fileName = 'error'; // the file name which will be used when the file is generated
			let fields = []; // the fields that have to be added to the CSV file (depending on the type selected)
			let today = new Date(); // today's date (used for the name of the file)
			let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate(); // YYYY-MM-DD date (used for the name of the file)

			new Promise(function (resolve) {
				switch (req.query.type) {
					case export_options[0]: // Events type
						Event.find({}, async function (errFindEvents, eventDoc) { // fetch all events information from the database
							if (!errFindEvents) {
								await Promise.all(eventDoc.map(async function (event) { // await promises to be resolved for every event
									let event_type = await genFunctions.getEventType(event.eventTypeID); // get event type info from the database
									let rooms = await genFunctions.getRoomInfo(event.rooms); // get room info from the database
									let visitors = await genFunctions.getVisitorInfo(event.visitors); // get visitor info from the database

									// when all the above promises are resolved
									Promise.all([event_type, visitors, rooms]).then(function () {
										let numberOfSpaces = 0; // used to count the number of spaces available
										let numberOfVisitors = 0; // used to count the number of visitors

										/* Count the number of spaces available */
										rooms.forEach(function (room) {
											numberOfSpaces = numberOfSpaces + room.capacity;
										});
										/* End Count the number of spaces available */

										/* Count the number of visitors */
										visitors.forEach(function (visitor) {
											visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : "";
										});
										/* End Count the number of visitors */

										json_array.push({ // add the entity to the array of objects
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
							} else { // error while fetching information from the database
								console.log(errFindEvents);
							}

							// fields to be entered in the CSV file
							fields = ['ID', 'Name', 'Event Type', 'Event Spaces', 'Number of Visitors', 'Date', 'End Date', 'Location'];
							fileName = 'events' + date; // the CSV file name
							resolve(); // resolve the promise
						});
						break;
					case export_options[1]: // Archive Events type
						Archive.find({}, async function (errFindArchiveEvents, eventDoc) { // fetch all archive events information from the database
							if (!errFindArchiveEvents) {
								await Promise.all(eventDoc.map(async function (event) { // await promises to be resolved for every event
									let visitors = await genFunctions.getVisitorInfo(event.visitors); // get visitor info from the database

									// when all the visitor promises are resolved
									Promise.all([visitors]).then(function () {
										let numberOfVisitors = 0; // used to count the number of visitors

										/* Count the number of visitors */
										visitors.forEach(function (visitor) {
											visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : "";
										});
										/* End Count the number of visitors */

										json_array.push({ // add the entity to the array of objects
											ID: event._id,
											Name: event.eventName,
											'Event Type': event.eventType,
											'Event Spaces': event.numberOfSpaces,
											'Number of Visitors': numberOfVisitors,
											Date: event.date,
											'End Date': event.endDate,
											Location: event.location
										});
									});
								}));
							} else { // error while fetching information from the database
								console.log(errFindArchiveEvents);
							}

							// fields to be entered in the CSV file
							fields = ['ID', 'Name', 'Event Type', 'Event Spaces', 'Number of Visitors', 'Date', 'End Date', 'Location'];
							fileName = 'events' + date; // the CSV file name
							resolve(); // resolve the promise
						});
						break;
					case export_options[2]: // Equipment type
						genFunctions.getAllEquipment().then(function (eqDoc) { // fetch all equipment information from the database
							fields = ['ID', 'Name', 'Quantity']; // fields to be added in the CSV file

							/* Add the equipment entity to the array */
							eqDoc.forEach(function (equip) {
								let eq_object = { // create the entity object to be added in the CSV file
									ID: equip._id,
									Name: equip.typeName,
									Quantity: equip.quantity
								};

								/* Add the custom fields to the JSON */
								equip.customFields.forEach(function (field) {
									eq_object[field.fieldName] = field.fieldValue; // create the custom field to be appended to the object

									if (!fields.includes(field.fieldName)) {
										fields.push(field.fieldName); // add the custom field to the object
									}
								});
								/* End Add the custom fields to the JSON */

								json_array.push(eq_object); // add the object to the array of objects
							});
							/* End Add the equipment entity to the array */

							fileName = 'equipment' + date; // the CSV file name
							resolve(); // resolve the promise
						});
						break;
					case export_options[3]: // Staff type
						genFunctions.getAllStaff().then(function (staffDoc) { // fetch all staff information from the database
							staffDoc.forEach(function (staff_member) {
								json_array.push({ // add the entity to the array of objects
									'Full Name': staff_member.fullName,
									Email: staff_member.email,
									Phone: staff_member.phone,
									Role: staff_member.role
								});
							});

							fields = ['Full Name', 'Email', 'Phone', 'Role']; // fields to be added in the CSV file
							fileName = 'staff' + date; // the CSV file name
							resolve(); // resolve the promise
						});

						break;
					case export_options[4]: // Rooms type
						genFunctions.getAllRooms().then(function (roomsDoc) { // fetch all rooms information from the database
							fields = ['ID', 'Name', 'Quantity']; // fields to be added in the CSV file

							/* Add the room entity to the array */
							roomsDoc.forEach(function (room) {
								let room_object = { // create the entity object to be added in the CSV file
									ID: room._id,
									Name: room.roomName,
									Capacity: room.capacity
								};

								/* Add the custom fields to the JSON */
								room.customFields.forEach(function (field) {
									room_object[field.fieldName] = fieldValue; // create the custom field to be appended to the object

									if (!fields.includes(field.fieldName)) {
										fields.push(field.fieldName); // add the custom field to the object
									}
								});
								/* End Add the custom fields to the JSON */

								json_array.push(room_object); // add the entity to the array of objects
							});
							/* End Add the room entity to the array */

							fileName = 'rooms' + date; // the CSV file name
							resolve(); // resolve the promise
						});
						break;
					case export_options[5]: // Visitors type
						genFunctions.getAllVisitor().then(function (visitorDoc) { // fetch all visitors information from the database
							fields = ['ID', 'Lead Teacher Name', 'Contact Email', 'Contact Phone', 'Group Size']; // fields to be added in the CSV file

							visitorDoc.forEach(function (visitor) {
								json_array.push({ // add the entity to the array of objects
									ID: visitor._id,
									'Lead Teacher Name': visitor.leadTeacherName,
									'Contact Email': visitor.contactEmail,
									'Contact Phone': visitor.contactPhone,
									'Group Size': visitor.groupSize
								});
							});

							fileName = 'visitors' + date; // the CSV file name
							resolve(); // resolve the promise
						});
						break;
					case export_options[6]: // Event types
						genFunctions.getAllEventTypes().then(function (eventTypesDoc) { // fetch all event types from the database
							fields = ['ID', 'Name']; // fields to be added in the CSV file

							/* Add the event type entity to the array */
							eventTypesDoc.forEach(function (type) {
								let eventType_object = { // create the entity object to be added in the CSV file
									ID: type._id,
									Name: type.eventTypeName
								};

								/* Add the custom fields to the JSON */
								type.customFields.forEach(function (field) {
									eventType_object[field.fieldName] = fieldValue; // create the custom field to be appended to the object

									if (!fields.includes(field.fieldName)) {
										fields.push(field.fieldName); // add the custom field to the object
									}
								});
								/* End Add the custom fields to the JSON */

								json_array.push(eventType_object); // add the entity to the array of objects
							});
							/* End Add the event type entity to the array */

							fileName = 'eventTypes' + date; // the CSV file name
							resolve(); // resolve the promise
						});
						break;
					default: // if something that is not allowed is requested as a type
						resolve(); // resolve the promise
						break;
				}
			}).then(function () { // when the array is populated with the information
				if (json_array.length > 0) { // check if there is anything to export
					let csv = json2csv(json_array, fields); // convert the array to CSV object

					/* CSV file */
					res.setHeader('Content-disposition', 'attachment; filename=' + fileName + '.csv'); // specify the result to be a file
					res.set('Content-Type', 'text/csv'); // specify the type of the file
					res.status(200).send(csv); // this will ask the user to save it on his or her device
					/* End CSV file */
				} else { // nothing to export
					res.status(500).json({message: "Unable to process request, please try again."});
				}
			});
		} else { // no type is chosen, this happens only for a message when a request has been made (as a feedback to the user)
			res.render('export', {
				title: "Export",
				exportOptions: export_options,
				text: "Your download will start in a few seconds. Please be patient.",
				user: req.user
			});
		}
	} else { // Insufficient permissions
		res.status(500).json({message: "Unable to process request, please try again."});
	}
});

// USED ONLY FOR DEVELOPMENT PURPOSES
// LEFT HERE IF NEEDED FOR FUTURE TESTS
// router.get('/midnight', function(req, res){
// 	genFunctions.archiveEvents();
// 	genFunctions.notifyForApproachingEvents();
// });

module.exports = router; // export the route
