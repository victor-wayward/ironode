
// --- Session Cookie Handler ---

// stores session object to mongodb
// only the session ID is saved in the cookie itself  
// session data is stored server-side (referenced by the session ID)
// check 'sessions' collection on your db to get the feeling
// read express-session doc to alter options


const config = require('config');												// read configuration
const db = require('db');														// create db connection

// create session and session-store
var session = require('express-session');
var mongostore = require('connect-mongo')(session);

var sess = new session({
    secret: config.get('site.cookie-secret'),
    name: config.get('site.name'),
    store: new mongostore({ 
		mongooseConnection: db.connection,
		touchAfter: 24 * 3600, 													// update after 1 day if there are no changes
		autoRemove: 'interval',
		autoRemoveInterval: 30													// remove expired sessions after 30 min
	}),
    proxy: true,
    resave: false,																// don't save session if unmodified (on every refresh)
    saveUninitialized: false,													// don't create session until something is to be stored
	maxAge: 60000																// 10 min expiration
});

if (process.env.NODE_ENV == 'production') sess.cookie.secure = true				// serve secure cookies (https only) 

module.exports = sess;

