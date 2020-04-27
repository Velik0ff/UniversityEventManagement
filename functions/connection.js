/**
 * Author: Lyuboslav Velikov
 * ID: 201186573
 * University of Liverpool
 * This file is used for the connection to the MongoDB
 * around all the files for the routes and the models.
 * @type {Mongoose} The object which establishes the connection to the database
 */

const mongoose = require('mongoose'); // include MongoDB package

mongoose.Promise = global.Promise; // use the default promise handler of NodeJS

mongoose.set('useCreateIndex', true); // use the created indexes in MongoDB
mongoose.set('useUnifiedTopology', true); // new Server Discover and Monitoring engine

mongoose.connect('mongodb://localhost/event_system',{
	auth: {
		user: 'UniAdmin2019',
		password: 'Uni@Liverpool@2019'
	},
	useNewUrlParser: true
}); // connect to db


mongoose.connection.once('open',function(){ // establish connection
	console.log("Connection to DB established!");
}).on('error',function(error){
	console.log('Error: '+error);
});

module.exports = mongoose; // export the object