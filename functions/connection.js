const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

mongoose.set('useCreateIndex', true);

mongoose.connect('mongodb://localhost/event_system',{
	auth: {
		user: 'UniAdmin2019',
		password: 'Uni@Liverpool@2019'
	},
	useNewUrlParser: true
}); // connect to db


mongoose.connection.once('open',function(){
	console.log("Connection to DB established!");
}).on('error',function(error){
	console.log('Error: '+error);
});

module.exports = mongoose;