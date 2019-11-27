const express = require('express');
const router = express.Router();

const list = [{id:1234,name:"User Name"},{id:1235,name:"User Name"},{id:1236,name:"User Name"}];

router.get('/list-visitors', function(req, res, next) {

	let columns = ["ID", "Full Name", "Options"];


	res.render('list', {
		title: 'Visitors List',
		list:list,
		columns:columns,
		editLink: "edit-visitor",
		viewLink: "view-visitor",
		addLink: "add-visitor"
	});
});

router.get('/view-visitor', function(req, res, next) {
	/* Logic to get info from database */

	/* End Logic to get info from database */



	list.forEach((item)=>{
		if(item.id == req.query.id){
			// let rows = [{"ID":}, "Event Name"];
			// let item_info = [item.id,item.name];

			let item_info = {
				"ID":item.id,
				"Name":item.name,
				"Group size":21,
				"School Name":"Lorem Ipsum Primary School"
			}

			res.render('view', {
				title: 'Viewing visitor: '+item.name,
				// rows: rows,
				item:item_info,
				listLink: 'list-visitors',
				editLink: 'edit-visitor?id='+item.id
			});
		}
	});
});

router.get('/edit-visitor', function(req, res, next) {
	list.forEach((item)=>{
		if(item.id == req.query.id){
			// let rows = [{"ID":}, "Event Name"];
			// let item_info = [item.id,item.name];

			let item_info = {
				"ID":item.id,
				"Name":item.name,
				"Group size":21,
				"School Name":"Lorem Ipsum Primary School"
			}

			res.render('edit', {
				title: 'Editing visitor: '+item.name,
				// rows: rows,
				item:item_info,
				editLink: 'view-visitor?id='+item.id,
				cancelLink: 'view-visitor?id='+item.id
			});
		}
	});
});

router.get('/add-visitor', function(req, res, next) {
	// let rows = [{"ID":}, "Event Name"];
	// let item_info = [item.id,item.name];

	let fields = [{name:"Name",type:"text",identifier:"name"},
		{name:"Email",type:"email",identifier:"email"},
		{name:"Contact Phone",type:"tel",identifier:"phone"},
		{name:"Group size",type:"number",identifier:"groupSize"},
		{name:"School Name",type:"text",identifier:"school"}]

	res.render('add', {
		title: 'Add New Staff Member',
		// rows: rows,
		fields:fields,
		cancelLink: 'list-visitors',
		customFields:false
	});
});

module.exports = router;
