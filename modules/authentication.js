
// --- Authentication Controller ---

// authenticates users using passport
// exports the passport object

const log = require('logger');								// create logger
const User = require('user');								// use user model
const bcrypt = require('bcrypt');							// use bcrypt lib to hash passwords
const passport = require('passport');						// use passport for authentication	
const LocalStrategy = require('passport-local').Strategy;	// with local strategy
const i18n = require('translation');						// use translation middleware


// local strategy requires a verify function that receives user credentials (form submitted) 
// and invokes a callback function that sets req.user with the user object  
// done is called with error, false or user, message to be flashed to the user
passport.use(new LocalStrategy(
	function(username, password, done) {
		
		User.findUser(username, function(err, user) {
			if (err) {
				log.error('findUser: ' + err);
				return done(err);
			}
			if (!user) {
				log.error('findUser: ' + username + ' does not exist');
				return done(null, false, { message: i18n.__("err.auth.NOTEXISTS") });
			}
			if (!user.login.enabled) {
				log.error('findUser: ' + username + ' is disabled');
				return done(null, false, { message: i18n.__("err.auth.DISABLED") });
			}
			
			bcrypt.compare(password, user.password, function(err, res) {
				if (res) {
					user.loginUser(function(err) {
						if (err) {
							log.error('loginUser: ' + err);
							return done(err);
						}
						else {
							log.info("Red carpet for " + user.username + ' [' + user.id + '] ' + user.email);
							return done(null, user);
						}
					});
				} 
				else {
					log.error('wrong password: ' + user.username + ' [' + user.id + '] ' + user.email);				
					user.badloginUser(function(err) {
						if (err) {
							log.error('badloginUser: ' + err);
							return done(err);
						}
					});
					return done(null, false, { message: i18n.__("err.auth.BADCRED") });
				} 
			});
		});
	}
));

// In order to restore authentication state across HTTP requests, passport needs
// to serialize users into and deserialize users out of the session. This boils down to
// storing the user id into the session cookie and, retrieving the user record by id 
// from the database.

// serializeUser just attaches user.id to the session (req.session.passport.user)
passport.serializeUser(function(user, done) {
	done(null, user.id);
});

// deserializeUser is invoked on every request by passport.session populating req.user
passport.deserializeUser(function(id, done) {
	User.findById(id, function (err, user) {
		if (err) {
			log.error('deserializeUser: ' + err);
			return done(err);
		}
		done(null, user);
	});
});


module.exports = passport;

