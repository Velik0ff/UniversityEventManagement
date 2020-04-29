require('dotenv').config({path: '/home/ubuntu/public_html/variables.env'}); // the environment variables

const createError = require('http-errors'); // used to handle the http errors like 504, 404, 503 and etc.
const express = require('express'); // used to handle the http requests to the server
const path = require('path'); // used for working with directory paths (required only for the front-end)
const cookieParser = require('cookie-parser'); // parse cookie header and include in the request
const logger = require('morgan'); // used to log everything in the console (for debugging purposes)
const express_session = require('express-session'); // used to store the session for mongo connection
const mongoose = require('./functions/connection'); // mongo connection
const bodyParser = require('body-parser'); // body parser for POST/GET methods
const passport = require('passport'); // used for authentication
const process = require('process'); // used to get the environment variables (variables.env)
const genFunctions = require('./functions/generalFunctions'); // general functions used to manipulate and fetch data

const MongoStore = require('connect-mongo')(express_session); // the mongoDB connection

/* Routes */
const indexRouter = require('./routes/index'); // the general routes like /login, /authorize, /calendar, /subscribe, /export
const usersRouter = require('./routes/users'); // staff member routes
const rolesRouter = require('./routes/roles'); // role routes
const roomsRouter = require('./routes/rooms'); // room routes
const eventsRouter = require('./routes/events'); // event routes
const visitorsRouter = require('./routes/visitors'); // visitor routes
const equipmentRouter = require('./routes/equipment'); // equipment routes
const eventTypesRouter = require('./routes/eventTypes'); // event type routes
/* End Routes */

const app = express(); // the express

let port = 8081; // the port of the node server

app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({limit: '150mb', extended: true})); // maximum size of the request
app.use(express_session({ // cookie session
	secret: 'UniLiv2020',
	store: new MongoStore({
		mongooseConnection: mongoose.connection,
		collection: 'session',
	}),
	resave: false,
	saveUninitialized: false
}));

/* Authenticator initialize */
app.use(passport.initialize()); // initialize the authentication package
app.use(passport.session()); // calls serializeUser and deserializeUser
/* End Authenticator initialize */

/* View Engine */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug'); // set the view engine to be PUG/Jade
/* End View Engine */

/* Express configuration */
app.use(logger('dev')); // used to log everything in the console (for debugging purposes)
app.use(express.json()); // parses incoming requests as JSON
app.use(express.urlencoded({extended: false})); // do not post nested objects in the request
app.use(cookieParser()); // parse cookie header and include in the request
app.use(express.static(path.join(__dirname, 'public'))); // public is used for elements like scripts for the front-end and etc.
/* End Express configuration */

/* App to use routes */
app.use('/', indexRouter); // the general routes like /login, /authorize, /calendar, /subscribe, /export
app.use('/roles', rolesRouter); // roles routes
app.use('/rooms', roomsRouter); // rooms routes
app.use('/users', usersRouter); // staff members routes
app.use('/events', eventsRouter); // events routes
app.use('/visitors', visitorsRouter); // visitors routes
app.use('/equipment', equipmentRouter); // equipment routes
app.use('/event-types', eventTypesRouter); // event type routes
/* End App to use routes */

/* Access the API only via the domain */
app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", process.env.DOMAIN);
	res.header("Access-Control-Allow-Credentials", true);
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});
/* End Access the API only via the domain */

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// error handler
app.use(function (err, req, res) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});//

// module.exports = app;

/* App server */
app.listen(port, function(){
	console.log('App listening on port ' + port + '!'); // only for debugging purposes

	/* Get time left till midnight in milliseconds */
	let now = new Date(); // get the date now
	let year = now.getUTCFullYear(); // get current year
	let month = now.getUTCMonth(); // get current month
	let day = now.getUTCDate(); // get current day

	let startDayHour = Date.UTC(year,month,day,0,0,0,0); // midnight on the current day
	let midnight = startDayHour + 86400000; // midnight that will happen after the current day

	let time_left = midnight - now.getTime(); // time left till midnight
	/* End Get time left till midnight in milliseconds */

	/* Midnight trigger */
	// used to archive the events and send emails to staff members for events without a student helper
	setTimeout(function(){ // time to 00:00 the next day
		genFunctions.archiveEvents(); // archive the events that the date has passed
		genFunctions.notifyForApproachingEvents(); // send notifications to staff members for events without a student helper
		setInterval(function(){ // interval of 24 hours
			genFunctions.archiveEvents(); // archive the events that the date has passed
			genFunctions.notifyForApproachingEvents(); // send notifications to staff members for events without a student helper
		},86400000);
	}, time_left);
	/* End Midnight trigger */
});
/* End App server */

