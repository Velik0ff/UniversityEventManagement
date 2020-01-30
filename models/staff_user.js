const mongoose = require("mongoose");
const bcrypt = require('bcryptjs'); // required for encryption of the password

function validateEmail(email) { // validate email
	const email_regex=/^([a-z0-9]+)[-_.]?([a-z0-9]+)@([a-z0-9]{2,}).([a-z0-9]{2,})$/i;
	console.log(email);
	return email_regex.test(email);
}

function validatePassword(password) { // validate password
	const password_regex=/^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*[0-9]))|((?=.*[A-Z])(?=.*[0-9])))(?=.{6,})/;
	return password_regex.test(password);
}

var StaffSchema = new mongoose.Schema({
	fullName:{ type: String },
	email:{ type: String, required: [true, "Email must be provided"], validate: [{ validator: value => validateEmail(value), msg:"Email entered is not valid"}] },
	password:{ type: String, required: true, validate: [{ validator: value => validatePassword(value), msg: "Password is not valid, it must contain 1 lowercase letter, 1 uppercase letter and one number and it must be at least 6 characters long."}] },
	phone:{ type: String },
	role:{ type: String, required: [true, "Role must be stated"] }
});

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

module.exports = mongoose.model("Staff",StaffSchema);