var util = require("util");
var loopback = require('loopback');
var boot = require('loopback-boot');
var app = module.exports = loopback();

// Passport configurators..
var loopbackPassport = require('loopback-component-passport');
var PassportConfigurator = loopbackPassport.PassportConfigurator;
var passportConfigurator = new PassportConfigurator(app);

/*
 * body-parser is a piece of express middleware that
 *   reads a form's input and stores it as a javascript
 *   object accessible through `req.body`
 *
 */
var bodyParser = require('body-parser');

/**
 * Flash messages for passport
 *
 * Setting the failureFlash option to true instructs Passport to flash an
 * error message using the message given by the strategy's verify callback,
 * if any. This is often the best approach, because the verify callback
 * can make the most accurate determination of why authentication failed.
 */
var flash = require('express-flash');

// attempt to build the providers/passport config
var config = {};
try {
    config = require('../providers.json');
} catch (err) {
    console.trace(err);
    process.exit(1); // fatal
}

// -- Add your pre-processing middleware here --


// boot scripts mount components like REST API
//boot(app, __dirname);

// to support JSON-encoded bodies
app.middleware('parse', bodyParser.json());
// to support URL-encoded bodies
app.middleware('parse', bodyParser.urlencoded({
    extended: true
}));

// The access token is only available after boot
app.middleware('auth', loopback.token({
    model: app.models.accessToken
}));

app.middleware('session:before', loopback.cookieParser(app.get('cookieSecret')));
app.middleware('session', loopback.session({
    secret: 'kitty',
    saveUninitialized: true,
    resave: true
}));

var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

app.get('/', function (req, res, next) {
    res.render('pages/index', {
        user: req.user,
        url: req.url
    });
});

app.get('/auth/account', ensureLoggedIn('/login'), function (req, res, next) {
    res.render('pages/loginProfiles', {
        user: req.user,
        url: req.url
    });
});

app.get('/link/account', ensureLoggedIn('/login'), function (req, res, next) {
    res.render('pages/linkedAccounts', {
        user: req.user,
        url: req.url
    });
});

app.get('/local', function (req, res, next) {
    res.render('pages/local', {
        user: req.user,
        url: req.url
    });
});

app.get('/signup', function (req, res, next) {
    res.render('pages/signup', {
        user: req.user,
        url: req.url
    });
});

app.post('/signup', function (req, res, next) {

    var User = app.models.user;

    var newUser = {};
    newUser.email = req.body.email.toLowerCase();
    newUser.username = req.body.username.trim();
    newUser.password = req.body.password;

    User.create(newUser, function (err, user) {
        if (err) {
            req.flash('error', err.message);
            return res.redirect('back');
        } else {
            // Passport exposes a login() function on req (also aliased as logIn())
            // that can be used to establish a login session. This function is
            // primarily used when users sign up, during which req.login() can
            // be invoked to log in the newly registered user.
            req.login(user, function (err) {
                if (err) {
                    req.flash('error', err.message);
                    return res.redirect('back');
                }
                return res.redirect('/auth/account');
            });
        }
    });
});

app.get('/login', function (req, res, next) {
    res.render('pages/login', {
        user: req.user,
        url: req.url
    });
});

app.get('/auth/logout', function (req, res, next) {
    rpeq.logout();
    res.redirect('/');
});

// -- Mount static files here--
// All static middleware should be registered at the end, as all requests
// passing the static middleware are hitting the file system
// Example:
var path = require('path');
app.use(loopback.static(path.resolve(__dirname, '../client/public')));

// Requests that get this far won't be handled
// by any middleware. Convert them into a 404 error
// that will be handled later down the chain.
//app.use(loopback.urlNotFound());

// The ultimate error handler.
app.use(loopback.errorHandler());

app.start = function () {
    // start the web server
    return app.listen(function () {
        app.emit('started');
        var baseUrl = app.get('url').replace(/\/$/, '');
        console.log('%s %s', __dirname, util.inspect(app.get('url')));
        console.log('Web server listening at: %s', baseUrl);
        if (app.get('loopback-component-explorer')) {
            var explorerPath = app.get('loopback-component-explorer').mountPath;
            console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
        }
    });
};

app.boot = function (cb) {
    // boot scripts mount components like REST API
    boot(app, __dirname, function (err) {
        if (err) throw err;


// We need flash messages to see passport errors
        app.use(flash());

        app.start();

        app.loaded = true;
        app.emit('loaded');

        cb(app);
    });
};

app.boot(function (app) {
    app.emit('booted');
    console.log('booted');
});