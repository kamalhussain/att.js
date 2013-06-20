
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  //, request = require('request')
  , passport = require('passport')
  , util = require('util')
  , AttAlphaStrategy = require('passport-att-alpha').Strategy;

var app = express();

var clientId = process.env.ATT_CLIENT_ID;
var clientSecret = process.env.ATT_CLIENT_SECRET;
var callbackUrl = process.env.CALLBACK_URL;
console.log("clientId=" + clientId);
console.log("clientSecret=" + clientSecret);
console.log("callbackUrl=" + callbackUrl);

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete AT&T Alpha profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the AttAlphaStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and AttAlpha
//   profile), and invoke a callback with a user object.
passport.use(new AttAlphaStrategy({
    clientID: clientId,
    clientSecret: clientSecret,
    callbackURL: callbackUrl,
    passReqToCallback: true
  },
  function(req, accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // save accessToken
      req.session.alphaAccessToken = accessToken;
      // To keep the example simple, the user's apimatrix profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the apimatrix account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));


// Configuration

// configure Express
app.configure(function() {
  app.set('port', process.env.PORT || 5000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'tulips in sheffield', }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});


// Routes

app.get('/', function(req, res) {
  console.log("root page");
  if(req.user){
    res.render("loggedin", { accessToken: req.session.alphaAccessToken });
  } else {
    res.render('login');
  }
});

app.get('/login', function(req, res) {
  console.log("login page");
  res.render('login');
});

app.get('/loggedin', function(req, res) {
  console.log("loggedin page");
  if(req.user){
    res.render("loggedin", { accessToken: req.session.alphaAccessToken });
  } else {
    res.redirect('/');
  }
});

// GET /auth
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in AT&T Alpha authentication will involve
//   redirecting the user to apimatrix.tfoundry.com.  After authorization, apimatrix will
//   redirect the user back to this application at /users/auth/att/callback
app.get('/auth', 
  passport.authenticate('att-alpha', { scope: ['profile','webrtc'] }));

// GET /users/auth/att/callback
// Callback for main app
app.get('/users/auth/att/callback', 
  passport.authenticate('att-alpha'), 
  function(req, res){
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  console.log("logout");
  req.logout();
  res.redirect('/');
});

app.get('/login-failed', function (req, res) {
    res.send('<h1>Login failed</h1>');
});

/*
app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);
*/

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
