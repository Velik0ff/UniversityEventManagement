const mongoose = require("mongoose");
const bcrypt = require('bcryptjs'); // required for encryption of the password

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

let VisitorSchema = new mongoose.Schema({
	leadTeacherName:{ type: String, required: [true, "Lead teacher name must be provided"], validate: [{ validator: value => validateName(value), msg:"Full name entered is not valid"}] },
	institutionName: { type: String, required: [true, "Institution name must be provided"] },
	contactEmail: { type: String, required: [true, "Email must be provided"], validate: [{ validator: value => validateEmail(value), msg:"Email entered is not valid"}], unique: [true, "Email already exists."] },
	contactPhone:{ type: String },
	password:{ type: String, required: [true, "Password must be provided"], validate: [{ validator: value => validatePassword(value), msg: "Password must contain 1 lowercase letter, 1 uppercase letter and one number and it must be at least 6 characters long."}] },
	groupSize:{ type: Number, required: [true, "Group size must be provided"] },
	permission:{ type: Number, required: true },
	attendingEvents:[{
		eventID: { type: String, required:true }
	}],
	resetPassCode:{ type: String }
});

/* Methods to Compare and Hash Password and validate email */
VisitorSchema.methods = {
	comparePassword: function (inputPassword) {
		return bcrypt.compareSync(inputPassword, this.password)
	},
	hashPassword: plainTextPassword => {
		return bcrypt.hashSync(plainTextPassword, 10)
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