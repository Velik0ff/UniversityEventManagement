const mongoose = require("mongoose");
const bcrypt = require('bcryptjs'); // required for encryption of the password

var VisitorSchema = new mongoose.Schema({
	username:{ type: String, required: true },
	password:{ type: String, required: true },
	leadTeacherName:{ type: String, required: true },
	contactEmail: { type: String },
	contactPhone:{ type: String },
	expiryDate:{ type: Date }
});

/* Methods to Compare and Hash Password */
VisitorSchema.methods = {
	comparePassword: function (inputPassword) {
		return bcrypt.compareSync(inputPassword, this.password)
	},
	hashPassword: plainTextPassword => {
		return bcrypt.hashSync(plainTextPassword, 10)
	}
};
/* End Methods to Compare and Hash Password */

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