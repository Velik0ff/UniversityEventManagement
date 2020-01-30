const mongoose = require("mongoose");
const bcrypt = require('bcryptjs'); // required for encryption of the password

var VisitorSchema = new mongoose.Schema({
	username:{ type: String, required: [true, "Username must be provided"] },
	password:{ type: String, required: true },
	leadTeacherName:{ type: String, required: [true, "Lead teacher name must be provided"] },
	contactEmail: { type: String, validate: [this.validateEmail, "Email entered is not valid"] },
	contactPhone:{ type: String },
	expiryDate:{ type: Date }
});

/* Methods to Compare and Hash Password and validate email */
VisitorSchema.methods = {
	comparePassword: function (inputPassword) {
		return bcrypt.compareSync(inputPassword, this.password)
	},
	hashPassword: plainTextPassword => {
		return bcrypt.hashSync(plainTextPassword, 10)
	},
	validateEmail: function (email) { // va
		const email_regex=/^([a-z0-9]+)[-_.]?([a-z0-9]+)@([a-z0-9]{2,}).([a-z0-9]{2,})$/i;
		return email_regex.test(email);
	}
};
/* End Methods to Compare and Hash Password and validate email */

/* Update the password to the hashed password before saving */
VisitorSchema.pre('save', function (next) {
	if (!this.password) { // if no password is provided
		next();
	} else { // password provided
		this.password = this.hashPassword(this.password); // replace string of password with the hashed password
		next();
	}
});
/* End Update the password to the hashed password before saving */

module.exports = mongoose.model("Visitor",VisitorSchema);