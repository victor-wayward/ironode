
// unix/dos path resolver, get app path
const path = require('path');
const appdir = require('app-root-dir').get();

// set additional module folders
require('app-module-path').addPath('modules');
require('app-module-path').addPath('routes');

// create logger
const log = require('logger');
var dashes = ''; for (i = 0; i < 80; i++) dashes += '-';
log.info(dashes); log.info('START');

// initialize - copy client includes (app/modules/init.js)
require('init')(function(err) {
	if (err) {
		throw err;				// unhandled exception
		process.exit(1);		// exit with error
	}
});

// read app configuration (config)
const config = require('config');
const port = config.get('server.port');

// create express application 
var express = require('express');
var app = express();

//app.use((err, req, res, next) => {
//  // log the error...
//  res.sendStatus(err.httpStatusCode).json(err)
//})


// trust first proxy (enable it if you use say nginx at the front)
if (app.get('env') === 'production') app.set('trust proxy', 1); 		

// protect headers with helmet
var helmet = require('helmet');
app.use(helmet());

// setup server access (error) log (morgan) [use a write stream in append mode]
var morgan = require('morgan');		
var fs = require('fs');			
var accessLog = fs.createWriteStream(path.resolve(appdir + '/logs/access.log'), { flags: 'a' });
app.use(morgan('combined', { 
	stream: accessLog, 
	skip: function(req, res) { 
		return res.statusCode < 400 
	} 
}));

// attach socket.io to server
var http = require('http').Server(app);
var io = require('socket.io')(http);

// create socket controller (app/modules/socket.js)
var handleSocket = require('socket');
io.on('connection', function(socket) {
   handleSocket(socket);
});

// use session (app/modules/session.js)
var session = require('session');
app.use(session);

// use translation module (not as middleware)
var i18n = require('translation');

// register handlebars engine, set the default layout and a template translation helper
var exphbs = require('express-handlebars');
var hbs = exphbs.create({
	defaultLayout: 'main',
	helpers: {
		I18n: function(str) { 
			return i18n.__({ phrase: str, locale: i18n.locale });
		}
	}
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// define static content directory
app.use(express.static(path.resolve(appdir + '/public')));

// define favicon path
const favicon = require('serve-favicon');
app.use(favicon(path.resolve(appdir + '/public/img/favicon.ico')));

// create authentication controller
var passport = require('authentication');
app.use(passport.initialize());
app.use(passport.session());

// set locale by reading lang parameter, export lang to the template
app.use(function(req, res, next) {
	if (i18n.getLocales().indexOf(req.query.lang) >= 0) i18n.locale = req.query.lang;
	res.locals.lang = i18n.locale;
	next();
});

// export user object to the template
app.use(function(req, res, next) {
	res.locals.user = req.user;
	next();
});

// create navigation bar
app.use(function(req, res, next) {
	res.locals.navlinks = [
		{ name: i18n.__('nav.HOME'), link: '/' },	
		{ name: i18n.__('nav.CONTACT'), link: '/contact' },
	];
	// if (req.user) res.locals.navlinks.push({ name: i18n.__('nav.PROFILE'), link: '/profile' });
	next();
});

// create lang bar
app.use(function(req, res, next) {
	res.locals.langlinks = [
		{ lang: i18n.getLocales()[0] },
		{ lang: i18n.getLocales()[1] },
	];
	// set a variable indicating active element, it is needed for the navbar css
	var numlinks = res.locals.navlinks.length;
	for (var i=0; i<numlinks; i++) {
		if (req.path === res.locals.navlinks[i].link) res.locals.navlinks[i].active = ' active';
	}
	next();
});

// create application router, has to be instantiated after all middleware functions (app/modules/router.js)
var router = require ('router');
app.use('/', router);

// bring server up
http.listen(port, function () {
  console.log('listening on: ' + port);
  log.info('Listening on port ' + port);
});




