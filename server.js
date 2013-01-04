// super simple demo
var express = require('express'),
    RedisStore = require('connect-redis')(express),
    semiStatic = require('semi-static'),
    colors = require('colors'),
    attAuth = require('./att-express-auth'),
    portNumber = process.env.PORT || 5800,
    config = require('getconfig');

// init our app
app = express();

// configure the app
app.configure(function () {
    app.set('view engine', 'jade');
    app.use(express['static'](__dirname + '/static'));
    app.use(express['static'](__dirname + '/build'));
    app.use(express.cookieParser());
    app.use(express.session({ 
        secret: config.sessionSecret, 
        store: new RedisStore({db: config.redis.db}),
        cookie: {
            maxAge: 3600000 // one hour
        }
    }));
    app.use(attAuth.middleware({
        app: app,
        clientId: config.oauth.clientId,
        clientSecret: config.oauth.secret,
        scopes: ['profile', 'webrtc', 'messages'],
        redirectUrl: config.baseUrl + '/auth/callback',
        loginPageUrl: '/auth'
    }));
});

// always make "authed" and "token" available to templates (if we have them)
function softAuth(req, res, next) {
    var user = req.session.user;
    if (req.session.accessToken) {
        res.locals.user = user;
        res.locals.token = req.session.accessToken || {};
        res.locals.authed = true;
        res.locals.number = user.conference_phone_number || user.phone_number;
    } else {
        res.locals.authed = false;
    }
    next();
}

// our homepage
app.get('/', softAuth, function (req, res) {
    if (req.session.accessToken) {
        res.render(__dirname + '/views/static/demo');
    } else {
        res.render(__dirname + '/views/index');
    }
});

app.get('/demo', function (req, res) {
    res.redirect('/');
});

app.get('/logout', function (req, res) {
    req.session.user = null;
    req.session.accessToken = null;
    res.redirect('/');
});

// register our handler for "static" pages
app.get('*', softAuth, semiStatic());

// we can still have a normal 404 at the end
// because it will only do something if there's
// a path that matches.
app.all('*', function (req, res) {
    res.render('404', 404);
});

app.listen(portNumber);

// some flair
console.log('\nAT&T'.bold + ' FOUNDRY'.blue.bold);
console.log('~~~~~~~~~~~~');
console.log('visit http://localhost:' + portNumber + ' to see sample use.');
