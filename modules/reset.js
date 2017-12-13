
// --- Reset Password Controller ---

// (reset) finds user, calls user reset method to update db
// sends an email with the activation link
// on failure returns data entered (to be preserved on the form) together with a message
// on success returns user email together with a message

// (password) validates new password form, finds user and stores new password
// sends an email with the activation link
// on failure returns error message
// on success returns user object together with a message


const log = require('logger');					// create logger (modules/logger.js)
const User = require('user');					// use user model (modules/user.js)
const validate = require('validation');			// use validation helpers (modules/user.js)
const i18n = require('translation');			// use translation middleware
const bcrypt = require('bcrypt');				// crypto lib to hash password
const sendmail = require('email');				// email module (modules/email.js)

const config = require('config');				// read configuration (app/config)
const hash_rounds = config.get('register.hash-rounds');

// serves form that accepts email for password reset
exports.reset = function(email, done) {
	
	log.info("Reset password request: " + email);
	
	validate.email2reset(email, function(status, msg, user) {
		
		if (!status) {
			log.error("reset: validation faults");
			return done(null, email, i18n.__("reset.err.GENERIC"));
		}

		if (user.enabled) {
			user.resetUser (function (err) {
				if (err) {
					log.error("resetUser: " + user.info + ": " + err);
					if (err == 'toomany') return done(null, email, i18n.__("reset.err.TOOMANY"));
					if (err == 'toosoon') return done(null, email, i18n.__("reset.err.TOOSOON"));
					return done(null, email, i18n.__("reset.err.SYSERROR"));
				}
				
				sendmail.now(user, 'reset', function (err) {
					if (err) {
						log.error("sendmail: " + user.email + ": " + err);
						return done(null, email, i18n.__("reset.err.NOEMAIL"));
					}
					log.info("Reset email sent to: " + user.info);
					return done(user.email, null, i18n.__("reset.EMAILSENT"));
				});			
			});
		}
		else return done(null, email, i18n.__("reset.err.NOTLOCAL"));
	});	
}

// serves form that accepts new password
exports.password = function(reg, done) {

	log.info("New Password for: " + JSON.stringify(reg));
	
	var faults = 0;						// count validation faults (user has already been informed about them)
	validate.password(reg.password, function(status) {
		if (!status) faults++;
	});
	validate.verify({ password: reg.password, verify: reg.verify }, function(status, statustxt) {
		if (!status) faults++;
	});
	
	if (reg.password + reg.verify === '') return done(null, i18n.__("reset.err.PASSWORD"));
	

	if (faults) return done(null, i18n.__("reset.err.PASSWORD"));
	else {
		User.findUser(reg.username, function(err, user) {
			if (err) {
				log.error("password: User does not exist: " + reg.username);
				return done(null, i18n.__("reset.err.GENERIC"));
			}
			else {
				bcrypt.hash(reg.password, hash_rounds, function(err, hash) {
			
					if (err) {
						log.error("reset: bcrypt error");
						return done(null, reg, i18n.__("reset.err.GENERIC"));
					}
					else {
						user.setPassword (hash, function (err) {
							if (err) {
								log.error("setPassword: Failed for " + reg.username);
								return done(null, i18n.__("reset.err.GENERIC"));
							} 
							else {
								log.info("setPassword: for " + reg.username);
								return done(user, i18n.__("reset.DONE"));
							}
						});
					}
				});			
			}
		});
	}	
}	
	
