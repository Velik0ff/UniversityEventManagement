const mongoose = require("mongoose");

let RoleSchema = new mongoose.Schema({
	roleName:{ type: String, required: [true, "Role name must be provided"] },
	rolePermission:{ type: Number, required: [true, "Role permission must be provided"]}
});

module.exports = mongoose.model("Role",RoleSchema);