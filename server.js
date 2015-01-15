var application_root = __dirname,
        express = require('express'),
        path = require('path'),
        http = require('http');
var logger = require("log4js").getLogger("Server");
var app = express();
var nconf = require('nconf');

start();

function start(){

    // LOADING CONFIGURATION FILE
    require("./config").load();
    var bodyParser = require('body-parser');
    var session = require('express-session');
    var cookieParser = require('cookie-parser');
    var passport = require('passport');

    // public PATHS
    app.set('views', __dirname + '/app/views');
    app.set('view engine', 'jade');
    app.use(express.static(__dirname + '/public'));
    app.use(bodyParser());
    app.use(cookieParser()); // required before session.
    app.use(session({
        cookie: { maxAge : 3600000 }, //1 Hour
        secret: 'keyboard cat',
        proxy: true // if you do SSL outside of node.
    }));
    app.use(passport.initialize());
    app.use(passport.session());

    // ROUTES
    var routesUnauthentified = require('./app/routes/views')(app);
    var routesAdmin = require('./app/routes/admin/views')(app);
    var routesManager = require('./app/routes/manager/views')(app);
    var routesOthers = require('./app/routes/user/views')(app);

    var middleware = require("./app/middleware/middleware");

    app.use(function(req, res, next){
        res.status(404);

        // respond with html page
        if (req.accepts('html')) {
            middleware.render('404', req, res, { url: req.url });
        return;
        }

        // respond with json
        if (req.accepts('json')) {
            res.send({ error: 'Not found' });
        return;
        }

        // default to plain-text. send()
        res.type('txt').send('Not found');
    });



    app.use(function(err, req, res, next) {
        console.log(err);
        if (err.status === 404) {
            middleware.render('404', req, res, { status: 404 });
        } else {
            middleware.render('500', req, res, { error: {status: 500, message: "Erreur interne: " + err, stack: err.stack}});
        }
    });

    // PLUGINS
    var plugins = require("./app/plugins");
    plugins.init();

    // LISTEN PORT APP
    var served = app.listen(nconf.get('port'));

    // START CHAT SERVER
    var chatServer = require("./app/chat").start(served);

    logger.info("Ready to serve on " + nconf.get('port') + " port");

    /*
    replicator = require("./app/replicator");
    replicator.replicate("", {user: 'user', host: 'localhost', port: '22', passwd: 'passwd'}, function(data){
      logger.info(data);
    });
    */
    //replicator = require("./app/replicator");
    /*
    replicator.replicate("sddfdsfolbhudrrkfve", {user: 'mizore', host: 'localhost', port: '22', passwd: 'eid9eeka'}, function(data, err){
      logger.info(data);
    });
    */
    /*
    replicator.revoke("sshkeyTwo", {user: 'mizore', host: 'localhost', port: '22', passwd: 'eid9eeka'}, function(data, err){
      logger.info(data);
    });
    */
}
