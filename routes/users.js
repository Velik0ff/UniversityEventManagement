var express = require('express');
var router = express.Router();

const list = [{id:1234,name:"User Name",email:"john.doe@email.com"},{id:1235,name:"User Name",email:"john.doe@email.com"},{id:1236,name:"User Name",email:"john.doe@email.com"}];

router.get('/list-users', function(req, res, next) {

  let columns = ["ID", "Full Name", "Email", "Options"];


  res.render('list', {
    title: 'Staff List',
    list:list,
    columns:columns,
    editLink: "edit-user",
    viewLink: "view-user",
    addLink: "add-user"
  });
});

router.get('/view-user', function(req, res, next) {
  /* Logic to get info from database */

  /* End Logic to get info from database */



  list.forEach((item)=>{
    if(item.id == req.query.id){
      // let rows = [{"ID":}, "Event Name"];
      // let item_info = [item.id,item.name];

      let item_info = {
        "ID":item.id,
        "Name":item.name,
        "Email":"john.doe@email.com",
        "Role":"IT Support",
      }

      res.render('view', {
        title: 'Viewing staff member: '+item.name,
        // rows: rows,
        item:item_info,
        listLink: 'list-users',
        editLink: 'edit-user?id='+item.id
      });
    }
  });
});

router.get('/edit-user', function(req, res, next) {
  list.forEach((item)=>{
    if(item.id == req.query.id){
      // let rows = [{"ID":}, "Event Name"];
      // let item_info = [item.id,item.name];

      let item_info = {
        "ID":item.id,
        "Name":item.name,
        "Email":"john.doe@email.com",
        "Role":"IT Support",
      }

      res.render('edit', {
        title: 'Editing staff member: '+item.name,
        // rows: rows,
        item:item_info,
        editLink: 'view-user?id='+item.id,
        cancelLink: 'view-user?id='+item.id
      });
    }
  });
});

router.get('/add-user', function(req, res, next) {
  // let rows = [{"ID":}, "Event Name"];
  // let item_info = [item.id,item.name];

  let fields = [{name:"Name",type:"text",identifier:"name"},
    {name:"Email",type:"email",identifier:"email"},
    {name:"Role",type:"text",identifier:"role"}]

  res.render('add', {
    title: 'Add New Staff Member',
    // rows: rows,
    fields:fields,
    cancelLink: 'list-users',
    customFields:false
  });
});

module.exports = router;
