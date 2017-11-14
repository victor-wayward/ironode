
// --- Registration Controller ---

// validates passed form data (reg) and creates user to db
// returns stored user object on success
// returns data entered on failure (to be preserved on the form) 
// together with a message (to be flashed)


const log = require('logger');				// create logger (modules/logger.js)
const User = require('user');				// use user model (modules/user.js)
const bcrypt = require('bcrypt');			// bcrypt lib to hash password
const validate = require('validation');		// use validation helpers (modules/validation.js)
const i18n = require('translation');		// use translation middleware
const sendmail = require('email');			// email module (modules/email.js)
const crypto = require('crypto');			// crypto lib to create token

const config = require('config');			// read configuration (app/config)
const confirm_email = (config.get('register.confirm-email') == 'true');
const hash_rounds = config.get('register.hash-rounds');

exports.register = function(reg, done) {
	
	log.info("Registration request: " + reg.username + ", " + reg.email);

	if (reg.username + reg.email + reg.password + reg.verify === '') return done(null, reg, i18n.__("register.err.BLANK"));
	
	var faults = 0;							// count validation faults (user has already been informed about them)
	validate.username(reg.username, function(status) {
		if (!status) faults++;
	});
	validate.email(reg.email, function(status) {
		if (!status) faults++;
	});
	validate.password(reg.password, function(status) {
		if (!status) faults++;
	});
	validate.verify({ password: reg.password, verify: reg.verify }, function(status, statustxt) {
		if (!status) faults++;
	});

	if (faults) {
		log.error("registration: validation faults (hostile posting)");
		return done(null, reg, i18n.__("register.err.GENERIC"));
	}
	
	// create user
	const seed = crypto.randomBytes(20);
	authToken = 'r' + crypto.createHash('sha256').update(seed + this.email).digest('hex'); 		// registration token
	
	bcrypt.hash(reg.password, hash_rounds, function(err, hash) {								// hash password
		if (err) {
			log.error("registration: bcrypt error");
			return done(null, reg, i18n.__("register.err.SYSERROR"));
		}
		
		var newUser = new User({ 
			username: reg.username, 
			email: reg.email, 
			password: hash,
			login: { 
				enabled: !confirm_email, 
				authToken: authToken
			}
		});
		
		newUser.save(function (err) {
			if (err) {
				log.error('save: ' + err);
				return done(null, reg, i18n.__("register.err.SYSERROR"));
			}		
			
			if (confirm_email) {
				sendmail.now(newUser, 'register', function (err) {
					if (err) {
						log.error("sendmail: " + newUser.email + ": " + err);
						return done(newUser, null, i18n.__("register.err.NOEMAIL")); 
					}			
					log.info("Registration email sent to: " + newUser.info);
					return done(newUser, null, i18n.__("register.NEWACCOUNTVERIFY"));
				});	
			}
			else {
				log.info("Registration passed: " + newUser.info);
				return done(newUser, null, i18n.__("register.NEWACCOUNT"));
			}
		});		
	});
}

// enable user after registration link has been called and token has been verified
exports.activate = function(user, done) {
	user.enable(function (err) {
		if (err) {
			log.error("registration.enable: failed for " + user.info);
			return done(null, i18n.__("register.err.SYSERROR"));
		}
		log.info("Registration activation: " + user.info);
		return done(true, i18n.__("register.ACTIVATED"));
	});
}









/*	

user.saveUser(_reg, function(err, user) {
	if (err) {
		log.error(err);
		return done(null);
	}
	else {
		log.info('Registration passed for ' + user.email);
		return done(user);
	}
});

*/