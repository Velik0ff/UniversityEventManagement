require('dotenv').config({path: '/home/ubuntu/public_html/variables.env'});

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const express_session = require('express-session'); // used to store the session for mongo connection
const mongoose = require('./functions/connection'); // mongo connection
const bodyParser = require('body-parser'); // body parser for POST/GET methods
const passport = require('passport'); // used for authentication
const process = require('process');
const genFunctions = require('./functions/generalFunctions');

const MongoStore = require('connect-mongo')(express_session);

/* Models */
const Event = require('./models/Event');
const Archive = require('./models/EventArchive');
/* End Models */

/* Routes */
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const roomsRouter = require('./routes/rooms');
const eventsRouter = require('./routes/events');
const visitorsRouter = require('./routes/visitors');
const equipmentRouter = require('./routes/equipment');
const eventTypesRouter = require('./routes/eventTypes');
/* End Routes */

const app = express();

let port = 8081;

app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({limit: '150mb', extended: true}));
app.use(express_session({
	secret: 'UniLiv2020',
	store: new MongoStore({
		mongooseConnection: mongoose.connection,
		collection: 'session',
	}),
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session()); // calls serializeUser and deserializeUser

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/rooms', roomsRouter);
app.use('/users', usersRouter);
app.use('/events', eventsRouter);
app.use('/visitors', visitorsRouter);
app.use('/equipment', equipmentRouter);
app.use('/event-types', eventTypesRouter);

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
app.use(function (err, req, res, next) {//
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});//

// module.exports = app;

app.listen(port, () => console.log('App listening on port ' + port + '!'));

let now = new Date();
let year = now.getUTCFullYear();
let month = now.getUTCMonth();
let day = now.getUTCDate();

let startDayHour =Date.UTC(year,month,day,0,0,0,0);
let midnight = startDayHour + 86400000;

let time_left = midnight - now.getTime();

setTimeout(function(){
	setInterval(function(){
		archiveEvents();
	},86400000);
}, time_left);

async function archiveEvents() {
	Event.find({}, null, {sort: {date: -1}}, function (err, eventDoc) {
		if (!err) {
			if (eventDoc) {
				let today = Date.now();

				if ((eventDoc[0].endDate && Date.parse(eventDoc[0].endDate) > today) ||
					(!eventDoc[0].endDate && eventDoc[0].date && Date.parse(eventDoc[0].date) > today)) {

					eventDoc.forEach(async function (event) {
						if ((event.endDate && Date.parse(event.endDate) > today) ||
							(!event.endDate && event.date && Date.parse(event.date) > today)) {

							let equipment_event = await genFunctions.getEquipmentInfo(event.equipment);
							let rooms_event = await genFunctions.getRoomInfo(event.rooms);
							let event_type = await genFunctions.getEventType(event.eventTypeID);
							let staff_event = await genFunctions.getStaffInfo(event.staffChosen);
							let visitors_event = await genFunctions.getVisitorInfo(event.visitors);
							let equipment = [];
							let rooms = [];
							let staff = [];
							let numberOfSpaces = 0;
							let numberOfVisitors = 0;

							Promise.all([equipment_event, rooms_event, event_type, staff_event, visitors_event]).then((result) => {
								equipment_event.forEach(function (equip) {
									equipment.push({
										name: equip.typeName,
										quantity: equip.quantity + equip.reqQty,
										customFields: equip.customFields
									});
								});

								rooms_event.forEach(function (room) {
									rooms.push({
										roomName: room.roomName,
										capacity: room.capacity,
										customFields: room.customFields
									});
								});

								staff_event.forEach(function (staff_member) {
									staff.push({
										staffMemberName: staff_member.fullName,
										staffEmail: staff_member.email,
										role: staff_member.role
									});
								});

								rooms_event.forEach(function (room) { // count number of spaces
									numberOfSpaces = numberOfSpaces + room.capacity;
								});

								visitors_event.forEach(function (visitor) { //  count number of visitors
									visitor.groupSize && visitor.groupSize > 0 ? numberOfVisitors = numberOfVisitors + visitor.groupSize : "";
								});

								let new_archive_event = new Archive({
									eventID: event._id,
									eventName: event.eventName,
									equipment: equipment,
									rooms: rooms,
									eventType: event_type,
									staffChosen: staff,
									date: event.date,
									endDate: event.endDate,
									location: event.location,
									numberOfVisitors: numberOfVisitors,
									numberOfSpaces: numberOfSpaces
								});

								new_archive_event.save(function (errSave, saveDoc) {
									if (!errSave) {
										genFunctions.deleteEvent(event._id).then().catch();
									} else {
										console.log(errSave)
									}
								});
							});
						}
					});
				}
			}
		} else {
			console.log(err);
		}
	});
}
