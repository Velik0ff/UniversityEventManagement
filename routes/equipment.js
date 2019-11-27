const express = require('express');
const router = express.Router();

const list = [{id:1234,name:"Equipment Name",quantity:10},{id:1235,name:"Equipment Name",quantity:15},{id:1236,name:"Equipment Name",quantity:1}];

router.get('/list-equipment', function(req, res, next) {

	let columns = ["ID", "Full Name", "Quantity", "Options"];


	res.render('list', {
		title: 'Equipment List',
		list:list,
		columns:columns,
		editLink: "edit-equipment",
		viewLink: "view-equipment",
		addLink: "add-equipment"
	});
});

router.get('/view-equipment', function(req, res, next) {
	/* Logic to get info from database */

	/* End Logic to get info from database */



	list.forEach((item)=>{
		if(item.id == req.query.id){
			// let rows = [{"ID":}, "Event Name"];
			// let item_info = [item.id,item.name];

			let item_info = {
				"ID":item.id,
				"Name":item.name,
				"Quantity":item.quantity,
			}

			res.render('view', {
				title: 'Viewing equipment: '+item.name,
				// rows: rows,
				item:item_info,
				listLink: 'list-equipment',
				editLink: 'edit-equipment?id='+item.id
			});
		}
	});
});

router.get('/edit-equipment', function(req, res, next) {
	list.forEach((item)=>{
		if(item.id == req.query.id){
			// let rows = [{"ID":}, "Event Name"];
			// let item_info = [item.id,item.name];

			let item_info = {
				"ID":item.id,
				"Name":item.name,
				"Quantity":item.quantity,
			}

			res.render('edit', {
				title: 'Editing equipment: '+item.name,
				// rows: rows,
				item:item_info,
				editLink: 'view-equipment?id='+item.id,
				cancelLink: 'view-equipment?id='+item.id
			});
		}
	});
});

router.get('/add-equipment', function(req, res, next) {
	// let rows = [{"ID":}, "Event Name"];
	// let item_info = [item.id,item.name];

	let fields = [{name:"Name",type:"text",identifier:"name"},
								{name:"Quantity",type:"number",identifier:"quantity"}]

	res.render('add', {
		title: 'Add New Equipment',
		// rows: rows,
		fields:fields,
		cancelLink: 'list-equipment',
		customFields:true
	});
});

module.exports = router;
