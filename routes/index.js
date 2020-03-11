const express = require('express');
const router = express.Router();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy; /* this should be after passport*/
const Staff = require('../models/staff_user');
const Visitor = require('../models/visitor_user');

passport.use(new LocalStrategy(
  function(username, password, done) {
    Staff.findOne({ email: username }, function(err, user) {
      if (err) { return done(err); }
      if(user){
        if (!user.comparePassword(password)) {
          return done(null, false, { message: 'Incorrect password.' });
        }

        return done(null, {
          _id: user._id,
          username: user.email,
          permission: user.permission,
          role: user.role
        });
      } else {
        Visitor.findOne({ contactEmail: username }, function(err, visitor){
          if (err) { return done(err); }
          if(visitor){
            if(!visitor.comparePassword(password)){
              return done(null, false, { message: 'Incorrect password.' });
            }

            return done(null, {
              _id: visitor._id,
              username: visitor.contactEmail,
              permission: 'visitor',
              role: null
            });
          } else {
            return done(null, false, { message: 'Incorrect username.' });
          }
        });
      }
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  Staff.findOne({_id:id}, function(err, user) {
    // done(err, user);
    if(user) {
      done(err, {
        _id: user._id,
        username: user.email,
        permission: user.permission,
        role: user.role
      });
    } else {
      Visitor.findOne({ _id: id }, function(err, visitor){
        if(visitor) {
          done(err, {
            _id: visitor._id,
            username: visitor.contactEmail,
            permission: 1
          });
        } else {
          done(err,visitor);
        }
      });
    }
  });
});

/* Functions */
function validationErr(error){
  var error_msg = "";

  if(error.name === "ValidationError"){ // check if the error is from the validator
    if (typeof error.errors.password !== "undefined" &&
      error.errors.password !== null) {
      error_msg = error.errors.password.message
    }
    console.log(error_msg);
  }

  return error_msg;
}

function renderLogin(res,req,username,error,message){
  var fields = [{name: "Email", type: "email", identifier: "username"},
    {name: "Password", type: "password", identifier: "password"}];

  fields[0].value = username;

  return res.render('small',{
    title:"Log in",
    message:message,
    error:error,
    fields:fields,
    submitButton:{title:"Log in"},
    formAction:"/authorize",
    user:req.user
  });
}

function renderChangePassword(res,req,error,message){
  let fields = [{name: "Old Password", type: "password", identifier: "old-pass"},
    {name: "New Password", type: "password", identifier: "new-pass"},
    {name: "Confirm Password", type: "password", identifier: "confirm-pass"}];

  return res.render('small',{
    title:"Change Password",
    message:message,
    error:error,
    fields:fields,
    submitButton:{title:"Submit"},
    formAction:"/change-password",
    user:req.user
  });
}
/* End Functions */

/* GET login page. */
router.get('/', function(req, res, next) {
  if(req.user && req.user.permission < 0){
    res.redirect('/change-password');
  } else if(req.user){
    res.redirect('/welcome');
  } else {
    renderLogin(res,req,null,null,null);
  }
});

router.get('/welcome', function(req, res, next) {
  res.render('index', {
    title: "University of Liverpool Outreach Events",
    user: req.user
  });
});

router.post('/authorize', function(req, res, next){
  passport.authenticate('local', function(err, user, info) {
    if (err) { // error has occured
      console.log(err);
      renderLogin(res,req,req.body.username,"Unknown error has occurred",null);
    }
    if (!user) { // authentication failed
      renderLogin(res,req,req.body.username,"Credentials are not valid",null);
    }
    req.logIn(user, function(err) {
      if (err) { // error has occured
        console.log(err);
        renderLogin(res,req,req.body.username,"Unknown error has occurred",null);
      }

      if(req.user && req.user.permission >= 0) {
        res.redirect('/welcome');
      } else if(req.user && req.user.permission < 0){
        res.redirect('/change-password');
      }
    });
  })(req, res, next);
});

router.get('/change-password', function(req, res, next){
  if(req.user){
    renderChangePassword(res,req,null,null);
  } else {
    res.redirect('/login');
  }
});

router.post('/change-password', function(req, res, next){
  if(req.user){
    let fields = [{name: "Old Password", type: "password", identifier: "oldPass"},
      {name: "New Password", type: "password", identifier: "newPass"},
      {name: "Confirm Password", type: "password", identifier: "confirmPass"}];

    var Entity = null;
    var permission = req.user.permission;

    if(req.user.permission === -1){
      Entity = Staff;
      permission = 0;
    } else if(req.user.permission === -2) {
      Entity = Visitor;
      permission = 1;
    } else { // never going to happen
      Entity = Visitor;
      permission = 1;
    }

    let updates = {$set:{password:req.body.newPass, permission:permission}}

    Entity.updateOne({_id: req.body.ID}, updates, {runValidators: true}, function (err, update) {
      if (!err && update) {
        renderChangePassword(res,req,null,"Successfully changed password!");
      } else {
        let error = !update ? "User not found!" : validationErr(err);

        renderChangePassword(res,req,error,null);
      }
    });
  } else {
    res.redirect('/login');
  }
});

/* Logout */
router.get("/logout", function(req, res){
  if (req.user) {
    req.logout();
    res.redirect('/');
  } else {
    res.redirect('/');
  }
});
/* End Logout */

module.exports = router;
