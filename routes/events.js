const express = require('express');
const router = express.Router();

const list = [{id:1234,name:"Lorem Ipsum Event Name"},{id:1235,name:"Lorem Ipsum Event Name"},{id:1236,name:"Lorem Ipsum Event Name"}];

router.get('/list-events', function(req, res, next) {
	/* Logic to get info from database */

	/* End Logic to get info from database */
	let columns = ["ID", "Event Name", "Options"];


	res.render('list', {
		title: 'Events List',
		list:list,
		columns:columns,
		editLink: "edit-event",
		viewLink: "view-event",
		addLink: "add-event"
	});
});

router.get('/view-event', function(req, res, next) {
	/* Logic to get info from database */

	/* End Logic to get info from database */



	list.forEach((item)=>{
		if(item.id == req.query.id){
			// let rows = [{"ID":}, "Event Name"];
			// let item_info = [item.id,item.name];

			let item_info = {
				"ID":item.id,
				"Name":item.name,
				"Equipment":"Some Equipment info here",
				"Staff":"John Doe - IT Support",
				"Location":"Ashton Building",
				"Date":"25/12/2019"
			}

			res.render('view', {
				title: 'Viewing event: '+item.name,
				// rows: rows,
				item:item_info,
				listLink: 'list-events',
				editLink: 'edit-event?id='+item.id
			});
		}
	});
});

router.get('/edit-event', function(req, res, next) {
	list.forEach((item)=>{
		if(item.id == req.query.id){
			// let rows = [{"ID":}, "Event Name"];
			// let item_info = [item.id,item.name];

			let item_info = {
				"ID":item.id,
				"Name":item.name,
				"Equipment":"Some Equipment info here",
				"Staff":"John Doe - IT Support",
				"Location":"Ashton Building",
				"Date":"25/12/2019"
			}

			res.render('edit', {
				title: 'Editing event: '+item.name,
				// rows: rows,
				item:item_info,
				editLink: 'view-event?id='+item.id,
				cancelLink: 'view-event?id='+item.id
			});
		}
	});
});

router.get('/add-event', function(req, res, next) {
	// let rows = [{"ID":}, "Event Name"];
	// let item_info = [item.id,item.name];

	let fields = [{name:"Event Name",type:"text",identifier:"name"},
		{name:"Location",type:"text",identifier:"location"},
		{name:"Date",type:"date",identifier:"date"}]

	res.render('add', {
		title: 'Add New Staff Member',
		// rows: rows,
		fields:fields,
		cancelLink: 'list-events',
		customFields:false,
		equipmentFields:true,
		staffFields:true,
		visitorFields:true,
	});
});

module.exports = router;
