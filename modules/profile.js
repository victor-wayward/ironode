
// --- Profile Controller ---

//profile.update(req.user, req.body, req.params.form, function(result, xform, msg) {

const path = require('path');
const appdir = require('app-root-dir').get();
const log = require('logger');			// create logger (modules/logger.js)
var User = require('user');				// use user model (modules/user.js)
const bcrypt = require('bcrypt');		// bcrypt lib to hash password
const config = require('config');		// read configuration (app/config)
var validate = require('validation');	// use validation helpers (modules/validation.js)
var i18n = require('translation');		// use translation middleware
const sendmail = require('email');		// email module (modules/email.js)
var jimp = require("jimp");
const rounds = config.get('register.hash-rounds');

exports.update = function(user, inp, form, done) {  // is user really needed to be passed here or is it already available since user is logged in?
	
	log.info("Profile change request by " + user.id + ": " + JSON.stringify(inp));
	
	if (user.id != inp.id) return done(null, inp, i18n.__("err.profile.noid"));
	
	switch(form) {
		
		case 'account':
			
			var faults = 0;
			validate.username(inp.username, function(status) {
				if (!status) faults++;
			}, inp.id);
			validate.email(inp.email, function(status) {
				if (!status) faults++;
			}, inp.id);
			if (faults) return done(null, inp, i18n.__("err.profile.ACCOUNT"));
			
			user.setAccount(inp, function (err) {
				if (err) {
					log.error("setAccount: " + err);
					return done(null, inp, i18n.__("err.profile.ACCOUNT"));
				} 
				else {
					if (user.email != inp.email) {				
						sendmail.now(user, 'newemail', function (err) {
							if (err) {
								log.error("sendmail: " + inp.email + ": " + err);
								return done(null, inp, i18n.__("err.res.GENERIC"));
							}
							else {
								log.info("Sent (newmail) mail: " + inp.email);
								return done(true, inp, i18n.__("profile.EMAILSENT"));
							}
						});	
					}
					else {
						log.info("Account Update: " + user.id);
						return done(true, inp, i18n.__("profile.UPDATED"));		
					}
				}
			});

        break;
		
		case 'password':
		
			var faults = 0;
			validate.password(inp.password, function(status) {
				if (!status) faults++;
			});
			validate.verify({ password: inp.password, verify: inp.verify }, function(status, statustxt) {
				if (!status) faults++;
			});
			if (faults) return done(null, '', i18n.__("err.profile.PASSWORD"));
	
			bcrypt.hash(inp.password, rounds, function(err, hash) {			
				if (err) {
					log.error("profile: bcrypt error");
					return done(null, '', i18n.__("err.profile.GENERIC"));
				} else {
					user.setPassword (hash, function (err) {
						if (err) {
							log.error("setPassword: Failed for " + user.id);
							return done(null, '', i18n.__("err.profile.GENERIC"));
						} 
						else {
							log.info("setPassword: for " + user.id);
							return done(true, '', i18n.__("reset.DONE"));
						}
					});
				}
			});	
			
        break;
		
		case 'profile':
		
			user.setProfile (inp, function (err) {
				if (err) {
					log.error("setProfile: Failed for " + user.id);
					return done(null, inp, i18n.__("err.profile.GENERIC"));
				} 
				else {
					log.info("setProfile: for " + user.id);
					return done(true, null, i18n.__("profile.UPDATED"));
				}
			});
			
        break;
		
		case 'address':
			
			user.setAddress (inp, function (err) {
				if (err) {
					log.error("setProfile: Failed for " + user.id);
					return done(null, inp, i18n.__("err.profile.GENERIC"));
				} 
				else {
					log.info("setProfile: for " + user.id);
					return done(true, null, i18n.__("profile.UPDATED"));
				}
			});
			
        break;
		
		default:
			return done(null, inp, i18n.__("err.profile.NOFORM"));
	}
}

exports.setEmail = function(user, done) {
	user.setEmail (function (err) {
		if (err) {
			log.error("setEmail: Failed for " + user.id);
			return done(null, i18n.__("err.profile.GENERIC"));
		}
		else 
		{
			log.info("setEmail: Passed for " + user.id);
			return done(true, i18n.__("profile.UPDATED"));
		}
	});
}
	
exports.upload = function(user, file, done) {
	
	let suffix = file.name.split(".").pop();											// get suffix
	let new_avatarPath = '/avatar/' + 'new_' + user.id + '.' + suffix;					// temporary before crop
	let abs_avatarPath = path.resolve(appdir + '/public' + new_avatarPath);				// absolute path for saving file
	
	file.mv(abs_avatarPath, function(err) {
		if (err) {
			log.error("avatar: " + err);
			return done(i18n.__("err.avatar.GENERIC"));
		}
		else {
			jimp.read(abs_avatarPath, function (err, image) {					
				if (err) {
					log.error("jimp.read: " + err);
					return done(i18n.__("err.avatar.GENERIC"));
				}
				else {
					image
						.resize(360, jimp.AUTO)
						.write(abs_avatarPath);
					return done(null, new_avatarPath);
				}
			});		
		}		
	});			
}

exports.crop = function(user, image2crop, done) {
	
	let newImagePath = path.resolve(appdir + '/public' + image2crop.name);
	let suffix = image2crop.name.split(".").pop();											// get suffix
	let avatarPath = '/avatar/' + user.id + '.' + suffix;					// temporary before crop
	let abs_avatarPath = path.resolve(appdir + '/public' + avatarPath);				// absolute path for saving file
	
	user.setAvatar(avatarPath, function(err) {
		if (err) {
			log.error("setAvatar: " + err);
			return done(i18n.__("err.avatar.GENERIC"));
		}
		else {
			jimp.read(newImagePath, function (err, image) {					
				if (err) {
					log.error("jimp.read: " + err);
					return done(i18n.__("err.avatar.GENERIC"));
				}
				else {
					image
						.crop(parseInt(image2crop.cropx), parseInt(image2crop.cropy), parseInt(image2crop.cropw), parseInt(image2crop.croph))
						.resize(200, 200)
						.write(abs_avatarPath);
					return done(null);
				}
			});	
		}
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