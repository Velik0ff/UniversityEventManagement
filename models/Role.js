/**
 * Author: Lyuboslav Velikov
 * ID: 201186573
 * University of Liverpool
 * This file is used to define the structure of the role
 * before inserting the entity into the database
 * @type {createApplication} is the main route handler (router)
 */

const mongoose = require("mongoose");

/* Create the schema to be followed */
let RoleSchema = new mongoose.Schema({
	roleName:{ type: String, required: [true, "Role name must be provided"] },
	rolePermission:{ type: Number, required: [true, "Role permission must be provided"]}
});
/* End Create the schema to be followed */

module.exports = mongoose.model("Role",RoleSchema); // export the schema