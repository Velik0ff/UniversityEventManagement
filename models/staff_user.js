/**
 * Author: Lyuboslav Velikov
 * ID: 201186573
 * University of Liverpool
 * This file is used to define the structure of the staff member
 * before inserting the entity into the database
 * @type {createApplication} is the main route handler (router)
 */

const mongoose = require("mongoose");
const uniqueValidator = require('mongoose-unique-validator'); // check if a row has a unique value
const bcrypt = require('bcryptjs'); // required for encryption of the password

/* Functions to validate the information */
function validateEmail(email) { // validate email
	const email_regex=/^([a-z0-9]+)[-_.]?([a-z0-9]+)@([a-z0-9]{2,}).(.([a-z0-9]{2,}))+$/i;
	console.log(email);
	return email_regex.test(email);
}

function validatePassword(password) { // validate password
	const password_regex=/^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*[0-9]))|((?=.*[A-Z])(?=.*[0-9])))(?=.{6,})/;
	return password_regex.test(password);
}

function validateName(name) { // validate full name (can include title)
	const name_regex=/^([a-zA-Z_-\s.]){2,}$/i;
	return name_regex.test(name);
}
/* End Functions to validate the information */

/* Create the schema to be followed */
let StaffSchema = new mongoose.Schema({
	fullName:{ type: String, required: [true, "Full name must be provided"], validate: [{ validator: value => validateName(value), msg:"Full name entered is not valid"}] },
	email:{ type: String, required: [true, "Email must be provided"], validate: [{ validator: value => validateEmail(value), msg:"Email entered is not valid"}], unique: [true, "Email already exists."] },
	password:{ type: String, required: [true, "Password must be provided"], validate: [{ validator: value => validatePassword(value), msg: "Password must contain 1 lowercase letter, 1 uppercase letter and one number and it must be at least 6 characters long."}] },
	phone:{ type: String },
	role:{ type: String, required: [true, "Role must be stated"] },
	permission:{ type: Number, required: true},
	attendingEvents:[{
		eventID: {type: String, required: true},
		role: {type: String, required: true}
	}],
	attendedEvents:[{
		eventID: { type: String, required:true },
		eventName: { type: String, required: true },
		role: { type: String, required: true }
	}],
	resetPassCode: { type:String }
});
/* End Create the schema to be followed */

/* Methods to Compare and Hash Password */
StaffSchema.methods = {
	comparePassword: function (inputPassword) {
		return bcrypt.compareSync(inputPassword, this.password)
	},
	hashPassword: plainTextPassword => {
		return bcrypt.hashSync(plainTextPassword, 10)
	}
};
/* End Methods to Compare and Hash Password */

/* Update the password to the hashed password before saving */
StaffSchema.pre('save', function (next) {
	if (!this.password) { // if no password is provided
		next();
	} else { // password provided
		this.password = this.hashPassword(this.password); // replace string of password with the hashed password
		next();
	}
});
/* End Update the password to the hashed password before saving */

module.exports = mongoose.model("Staff",StaffSchema); // export the schema