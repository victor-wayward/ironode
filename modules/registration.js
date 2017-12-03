
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
const https = require('https');				// https module

const config = require('config');			// read configuration (app/config)
const captcha_secret = config.get('site.captcha.google-secret');
const confirm_email = (config.get('register.confirm-email') == 'true');
const hash_rounds = config.get('register.hash-rounds');


// contacts Google to verify CAPTCHA response (local)
function CheckCAPTCHA (resp, done) {

	if (!resp) {
		log.error("registration: Robot approaching");
		return done(i18n.__("register.err.UROBOT"));
	}
	else {
		const verlink = "https://www.google.com/recaptcha/api/siteverify?secret=" + captcha_secret + "&response=" + resp;
		https.get(verlink, function(res) {
			let data = "";
			res.on('data', function (chunk) {
				data += chunk.toString();
			});
			res.on('end', function() {
				try {
					let google_response = JSON.parse(data);
					if (google_response.success) return done(null);
					else {
						log.error("registration: Robot approaching");
						return done(i18n.__("register.err.UROBOT"));
					}
				} catch (err) {
					log.error("registration:" + JSON.stringify(err));
					return done(i18n.__("register.err.SYSERROR"));
				}
			});
		}).on('error', function(err) {
			log.error("registration: " + JSON.stringify(err));
			return done(i18n.__("register.err.NOHTTPS"));
		});
	}
}

// saves user to the database, optionally sends activation email (local)
function CreateUser(reg, done) {
		
	const seed = crypto.randomBytes(20);
	authToken = 'r' + crypto.createHash('sha256').update(seed + this.email).digest('hex'); 		// registration token
	
	bcrypt.hash(reg.password, hash_rounds, function(err, hash) {								// hash password
		if (err) {
			log.error("registration: bcrypt error");
			return done(null, i18n.__("register.err.SYSERROR"));
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
				return done(null, i18n.__("register.err.SYSERROR"));
			}		
			if (confirm_email) {
				sendmail.now(newUser, 'register', function (err) {
					if (err) {
						log.error("sendmail: " + newUser.email + ": " + err);
						return done(newUser, i18n.__("register.err.NOEMAIL")); 
					}			
					log.info("Registration email sent to: " + newUser.info);
					return done(newUser, i18n.__("register.NEWACCOUNTVERIFY"));
				});	
			}
			else {
				log.info("Registration passed: " + newUser.info);
				return done(newUser, i18n.__("register.NEWACCOUNT"));
			}
		});
	});
}
	
// validates reg form data, validates captcha if required
// on error returns previous form data and error message
// on success returns new user object with success message
exports.register = function(reg, show, done) {

	let create = false;
	
	log.info("Registration request: " + reg.username + ", " + reg.email);							// never ever log passwords

	if (reg.username + reg.email + reg.password + reg.verify === '') return done(null, reg, i18n.__("register.err.BLANK"));
	
	var faults = 0;																					// count validation faults, user has already been informed about them
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
		log.error("registration: validation faults");
		return done(null, reg, i18n.__("register.err.GENERIC"));
	}
	
	if (show) {
		CheckCAPTCHA(reg["g-recaptcha-response"], function(err) {
			if (err) return done(null, reg, err);
			CreateUser(reg, function(newuser, msg) {
				return (newuser) ? done(newuser, null, msg) : done(null, reg, msg);
			});
		});
	}
	else {
		CreateUser(reg, function(newuser, msg) {
			return (newuser) ? done(newuser, null, msg) : done(null, reg, msg);
		});
	}
}

// enable user after registration link has been called and token has been verified
exports.activate = function(user, done) {
	user.enable(function (err) {
		if (err) {
			log.error("registration.activate: failed for " + user.info);
			return done(null, i18n.__("register.err.SYSERROR"));
		}
		log.info("Registration activation: " + user.info);
		return done(true, i18n.__("register.ACTIVATED"));
	});
}

