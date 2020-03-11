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

/* GET login page. */
router.get('/', function(req, res, next) {
  if(req.user){
    res.redirect('/welcome');
  } else {
    res.render('login', {
      title: "Login",
      user: req.user
    });
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
      return res.render('login', {
        title:"Login",
        error: "Unknown error has occurred",
        username:req.body.username,
        message: null,
        user:req.user
      });
    }
    if (!user) { // authentication failed
      return res.render('login', {
        title:"Login",
        error: "Authentication failed",
        username:req.body.username,
        message: null,
        user:req.user
      });
    }
    req.logIn(user, function(err) {
      if (err) { // error has occured
        console.log(err);
        return res.render('login', {
          title:"Login",
          error: "Unknown error has occurred",
          username:req.body.username,
          message: null,
          user:req.user
        });
      }

      console.log(req.user)
      res.redirect('/welcome')
    });
  })(req, res, next);
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
