
// --- Authentication Controller ---

// authenticates users using passport
// exports the passport object

const log = require('logger');											// create logger
const User = require('user');											// use user model
const i18n = require('translation');									// use translation middleware
const bcrypt = require('bcrypt');										// use bcrypt lib to hash passwords

const passport = require('passport');									// use passport for authentication	
const LocalStrategy = require('passport-local').Strategy;				// with local strategy
const FacebookStrategy = require('passport-facebook').Strategy;			// with Facebook Startegy
const GoogleStrategy = require('passport-google-oauth2').Strategy;		// with Google Startegy
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;	// with LinkedIn Startegy

const config = require('config');										// read configuration
const siteURL= config.get('site.url');
const fb_id = config.get('social.facebook.id');
const fb_secret = config.get('social.facebook.secret');
const g_id = config.get('social.google.id');
const g_secret = config.get('social.google.secret');
const lin_id = config.get('social.linkedin.id');
const lin_secret = config.get('social.linkedin.secret');

// local strategy requires a verify function that receives user credentials (form submitted) 
// and invokes a callback function that sets req.user with the user object  
// done is called with error, false or user, message to be flashed to the user
passport.use('local', new LocalStrategy(
	function(username, password, done) {
		
		User.findUser(username, function(err, user) {
			if (err) {
				log.error('findUser: ' + err);
				return done(err);
			}
			if (!user) {
				log.error('findUser: ' + username + ' does not exist');
				return done(null, false, { message: i18n.__("login.err.NOTEXISTS") });
			}
			if (!user.login.enabled) {
				log.error('findUser: ' + username + ' is disabled');
				return done(null, false, { message: i18n.__("login.err.DISABLED") });
			}
			
			bcrypt.compare(password, user.password, function(err, res) {
				if (res) {
					user.loginUser('local', null, function(err) {
						if (err) {
							log.error('loginUser: ' + err);
							return done(err);
						}
						else {
							log.info("Red carpet for " + user.info);
							return done(null, user);
						}
					});
				} 
				else {
					log.error('wrong password: ' + user.info);				
					user.badloginUser(function(err) {
						if (err) {
							log.error('badloginUser: ' + err);
							return done(err);
						}
					});
					return done(null, false, { message: i18n.__("login.err.BADCRED") });
				} 
			});
		});
	}
));

passport.use('facebook', new FacebookStrategy({

		clientID: fb_id,
		clientSecret: fb_secret,
		callbackURL: siteURL + "/auth/facebook/callback",
		profileFields: ['id', 'email', 'name'],
	},

	// refreshToken is short-lived (2h) obtained by the login dialog
	// accessToken is the long-lived (60d) user token 
	// this is needed any time the app calls an API to read, modify or write a specific person's facebook data
	// both tokens together with user profile are returned by facebook
	// as it stands, there is no need to store these tokens, if you need them store them hashed!!
	function(accessToken, refreshToken, profile, done) {

		User.findUserByFacebookID(profile.id, profile.emails[0].value.toLowerCase(), function(err, user) {
			if (err) {
				log.error('findUserByFacebookID: ' + err);
				return done(err);
			}
			if (user) {
				user.loginUser('facebook', profile, function(err) {
					if (err) {
						log.error('loginUser: ' + err);
						return done(err);
					}
					else {
						log.info("Red carpet for " + user.finfo);
						return done(null, user);
					}
				});
			}
			else {
				var newUser = new User({ 
					email: profile.emails[0].value.toLowerCase(),
					profile: {
						name: profile.name.givenName,
						surname: profile.name.familyName
					},
					social: {
						facebook: {
							id: profile.id,
							email: profile.emails[0].value.toLowerCase(),	
							name: profile.name.givenName,
							surname: profile.name.familyName							
						}
					},
				});
				
				newUser.save(function (err) {
					if (err) {
						log.error('save: ' + err);
						return done(i18n.__("register.err.SYSERROR"));
					}		
					else {
						log.info("Registration passed: " + newUser.finfo);
						return done(null, newUser);
					}
				});
			}
		});
	}
));

passport.use('google', new GoogleStrategy({

		clientID: g_id,
		clientSecret: g_secret,
		callbackURL: siteURL + "/auth/google/callback",
		passReqToCallback: true
	},

	function(request, accessToken, refreshToken, profile, done) {

		User.findUserByGoogleID(profile.id, profile.emails[0].value.toLowerCase(), function(err, user) {
			if (err) {
				log.error('findUserByGoogleID: ' + err);
				return done(err);
			}
			if (user) {
				user.loginUser('google', profile, function(err) {
					if (err) {
						log.error('loginUser: ' + err);
						return done(err);
					}
					else {
						log.info("Red carpet for " + user.ginfo);
						return done(null, user);
					}
				});
			}
			else {
				var newUser = new User({ 
					email: profile.emails[0].value.toLowerCase(),
					profile: {
						name: profile.name.givenName,
						surname: profile.name.familyName
					},
					social: {
						google: {
							id: profile.id,
							email: profile.emails[0].value.toLowerCase(),	
							name: profile.name.givenName,
							surname: profile.name.familyName							
						}
					},
				});
				
				newUser.save(function (err) {
					if (err) {
						log.error('save: ' + err);
						return done(i18n.__("register.err.SYSERROR"));
					}		
					else {
						log.info("Registration passed: " + newUser.ginfo);
						return done(null, newUser);
					}
				});
			}
		});
	}
));

passport.use('linkedin', new LinkedInStrategy({

		clientID: lin_id,
		clientSecret: lin_secret,
		callbackURL: siteURL + "/auth/linkedin/callback",
		scope: ['r_emailaddress', 'r_basicprofile']
	},

	function(accessToken, refreshToken, profile, done) {

		User.findUserByLinkedInID(profile.id, profile.emails[0].value.toLowerCase(), function(err, user) {
			if (err) {
				log.error('findUserByLinkedInID: ' + err);
				return done(err);
			}
			if (user) {
				user.loginUser('linkedin', profile, function(err) {
					if (err) {
						log.error('loginUser: ' + err);
						return done(err);
					}
					else {
						log.info("Red carpet for " + user.linfo);
						return done(null, user);
					}
				});
			}
			else {
				var newUser = new User({ 
					email: profile.emails[0].value.toLowerCase(),
					profile: {
						name: profile.name.givenName,
						surname: profile.name.familyName
					},
					social: {
						linkedin: {
							id: profile.id,
							email: profile.emails[0].value.toLowerCase(),	
							name: profile.name.givenName,
							surname: profile.name.familyName							
						}
					},
				});
				
				newUser.save(function (err) {
					if (err) {
						log.error('save: ' + err);
						return done(i18n.__("register.err.SYSERROR"));
					}		
					else {
						log.info("Registration passed: " + newUser.linfo);
						return done(null, newUser);
					}
				});
			}
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

