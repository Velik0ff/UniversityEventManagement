const express = require('express');
const router = express.Router();
const short = require('short-uuid');
const nodemailer = require('nodemailer');

/* Model */
const User = require('../models/staff_user');
/* End Model */

/* Links */
const viewLink = "view-user";
const editLink = "edit-user";
const addLink = "add-user";
const deleteLink = "delete-user";
const listLink = "list-users";
/* End Links */

/* Functions */
function validationErr(error){
  var error_msg = "";

  if(error.name === "ValidationError"){ // check if the error is from the validator
    if (typeof error.errors.fullName !== "undefined" &&
      error.errors.fullName !== null) {
      error_msg = error.errors.fullName.message
    }
    if (typeof error.errors.email !== "undefined" &&
      error.errors.email !== null) {
      error_msg = error.errors.email.message
    }
    if (typeof error.errors.role !== "undefined" &&
      error.errors.role !== null) {
      error_msg = error.errors.role.message
    }
    console.log(error_msg);
  } else {
    if(error.code === 11000) { // duplicate entry
      error_msg = "Email already exists.";
    } else { // unknown error
      error_msg = "Unknown error has occurred during adding of the user. Please try again later.";
      console.log(error);
    }
  }

  return error_msg;
}

async function sendInvitationEmail(email, password, role){
  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  let testAccount = await nodemailer.createTestAccount();

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    // host: "smtp.mailgun.org",
    host:"smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
      // user: 'postmaster@sandbox93442b8153754117ada8172d0ef1129f.mailgun.org', // generated ethereal user
      // pass: 'd6b25d3e7711da468290a08b2c1db517-074fa10c-7dd01f0c' // generated ethereal password
    }
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"University of Liverpool Event System" <no-reply@uol-events.co.uk>', // sender address
    to: email, // list of receivers
    subject: "You have been invited to be a staff member", // Subject line
    html: "Hello,</br></br>" +
      "You have been invited to be a staff member with role: <b>" + role +
      "</b></br>" +
      "Your username is this email: <b>" + email +
      "</b></br>" +
      "The automatic password generated by the system is: <b>" + password +
      "</b></br><b>You will be prompted to change this password upon first login!</b></br>" +
      "</br><b>If you think that this email should not be sent to you, please ignore it or report back to: sglvelik@liv.ac.uk</b>"// html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}
/* End Functions */

router.get('/'+listLink, function(req, res, next) {
  if(req.user && req.user.permission === 0) {
    let columns = ["ID", "Full Name", "Email", "Options"];
    var error = "";

    User.find({}, function (err, users) {
      var userList = [];

      users.forEach(function (user) {
        userList.push({
          id: user._id,
          name: user.fullName,
          email: user.email
        });
      });

      error = userList.length === 0 ? "No results to show" : ""

      res.render('list', {
        title: 'Staff List',
        list: userList,
        columns: columns,
        editLink: editLink,
        viewLink: viewLink,
        addLink: addLink,
        deleteLink: deleteLink,
        error: error
      });
    });
  } else {
    res.redirect('/');
  }
});

router.get('/'+viewLink, function(req, res, next) {
  if(req.user && req.user.permission === 0) {
    /* Logic to get info from database */
    User.findOne({_id: req.query.id}, function (err, user) {
      if (!err && user) {
        res.render('view', {
          title: 'Viewing staff member: ' + user.fullName,
          error: null,
          // rows: rows,
          item: {
            ID: user._id,
            Name: user.fullName,
            Email: user.email,
            Role: user.role
          },
          listLink: listLink,
          deleteLink: deleteLink,
          editLink: editLink + '?id=' + user._id,
          user:req.user
        });
      } else {
        res.render('view', {
          error: "User not found!",
          listLink: listLink,
          user:req.user
        });
      }
    });
    /* End Logic to get info from database */
  } else {
    res.redirect('/');
  }
});

router.get('/'+addLink, function(req, res, next) {
  if(req.user && req.user.permission === 0) {
    let fields = [{name: "Name", type: "text", identifier: "name"},
      {name: "Email", type: "email", identifier: "email"},
      {name: "Role", type: "text", identifier: "role"}]

    res.render('add', {
      title: 'Add New Staff Member',
      fields: fields,
      cancelLink: listLink,
      addLink: '/users/' + addLink,
      customFields: false,
      error: null,
      message: null,
      user:req.user
    });
  } else {
    res.redirect('/');
  }
});

router.get('/'+editLink, function(req, res, next) {
  if(req.user && req.user.permission === 0) {
    User.findOne({_id: req.query.id}, function (err, user) {
      if (!err && user) {
        res.render('edit', {
          title: 'Editing staff member: ' + user.fullName,
          error: null,
          item: {
            ID: user._id,
            Name: user.fullName,
            Email: user.email,
            Role: user.role
          },
          editLink: '/users/' + editLink,
          cancelLink: viewLink + '?id=' + user._id,
          user:req.user
        });
      } else {
        res.render('edit', {
          error: "User not found!",
          listLink: listLink,
          user:req.user
        });
      }
    });
  } else {
    res.redirect('/');
  }
});

router.get('/'+deleteLink, function(req, res, next) {
  if(req.user && req.user.permission === 0) {
    User.deleteOne({_id: req.query.id}, function (err, deleteResult) {
      if (!err) {
        res.render('view', {
          deleteMsg: "Successfully deleted user!",
          listLink: listLink,
          user:req.user
        });
      } else {
        console.log(err); // console log the error
        res.render('view', {
          error: "User not found!",
          listLink: listLink,
          user:req.user
        });
      }
    });
  } else {
    res.redirect('/');
  }
});

router.post('/'+editLink, function(req, res, next) {
  if(req.user && req.user.permission === 0) {
    let updates = {$set: {fullName: req.body.Name, email: req.body.Email, role: req.body.Role, phone: req.body.Phone}}

    User.updateOne({_id: req.body.ID}, updates, {runValidators: true}, function (err, update) {
      if (!err && update) {
        res.render('edit', {
          title: 'Editing staff member: ' + req.body.Name,
          error: null,
          errorCritical: false,
          message: "Successfully updated user: " + req.body.Email,
          item: {
            ID: req.body.ID,
            Name: req.body.Name,
            Email: req.body.Email,
            Phone: req.body.Phone,
            Role: req.body.Role
          },
          editLink: '/users/' + editLink,
          cancelLink: viewLink + '?id=' + req.body.ID,
          user:req.user
        });
      } else if (!update) {
        res.render('edit', {
          error: "User not found!",
          errorCritical: true,
          listLink: listLink,
          user:req.user
        });
      } else {
        let error = validationErr(err);

        res.render('edit', {
          title: 'Editing staff member: ' + req.body.Name,
          error: error,
          errorCritical: false,
          message: null,
          item: {
            ID: req.body.ID,
            Name: req.body.Name,
            Email: req.body.Email,
            Phone: req.body.Phone,
            Role: req.body.Role
          },
          editLink: '/users/' + editLink,
          cancelLink: viewLink + '?id=' + req.body.ID,
          user:req.user
        });
      }
    });
  } else {
    res.redirect('/');
  }
});

router.post('/'+addLink, function(req, res, next) {
  if(req.user && req.user.permission === 0) {
    var error_msg = "";
    var message = "";
    let password_to_insert = short().new();
    let fields = [{name: "Name", type: "text", identifier: "name"},
      {name: "Email", type: "email", identifier: "email"},
      {name: "Phone", type: "tel", identifier: "phone"},
      {name: "Role", type: "text", identifier: "role"}];

    let new_user = new User({ // new user object to be inserted
      fullName: req.body.Name,
      email: req.body.Email,
      password: password_to_insert,
      role: req.body.Role,
      permission: 0,
      phone: req.body.Phone ? req.body.Phone : null
    });

    function renderScreen() {
      res.render('add', {
        title: 'Add New Staff Member',
        // rows: rows,
        fields: fields,
        cancelLink: listLink,
        addLink: '/users/' + addLink,
        customFields: false,
        error: error_msg,
        message: message,
        user:req.user
      });
    }

    /* Insert new user */
    new_user.save(function (error, userDoc) {
      if (!error) {
        message = "Successfully added new user with email: " + req.body.Email;
        console.log(message);
        sendInvitationEmail(req.body.Email, password_to_insert, req.body.Role);
      } else {
        error_msg = validationErr(error);
      }

      renderScreen();
    });
    /* End Insert new user */
  } else {
    res.redirect('/');
  }
});

module.exports = router;
