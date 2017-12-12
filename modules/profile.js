
// --- Profile Controller ---

// Update user profile 

const path = require('path');					// unix/dos path resolver
const appdir = require('app-root-dir').get();	// get app path
const log = require('logger');					// create logger (modules/logger)
const User = require('user');					// use user model (modules/user)
const bcrypt = require('bcrypt');				// bcrypt lib to hash password
const jimp = require("jimp");					// jimp image processing lib

const validate = require('validation');			// use validation helpers (modules/validation)
const i18n = require('translation');			// use translation (modules/translation)
const sendmail = require('email');				// email module (modules/email)

const config = require('config');				// read configuration (app/config)
const rounds = config.get('register.hash-rounds');
const confirm_email = (config.get('register.confirm-email') == 'true');

exports.update = function(user, inp, form, done) {
	
	if (form == 'password') log.info("Profile: password change request by " + user.info);
	else log.info("Profile: change request by " + user.info + ": " + JSON.stringify(inp));
	
	if (user.id != inp.id) return done(null, inp, i18n.__("profile.err.noid"));
	
	switch(form) {
		
		case 'account':
			
			var faults = 0;
			validate.username(inp.username, function(status) {
				if (!status) faults++;
			}, inp.id);
			validate.email(inp.email, function(status) {
				if (!status) faults++;
			}, inp.id);
			if (faults) return done(null, inp, i18n.__("profile.err.GENERIC"));
			
			user.setAccount(inp, function (err) {
				if (err) {
					log.error("setAccount: " + err);
					return done(null, inp, i18n.__("profile.err.ACCOUNT"));
				} 
			
				if (user.email != inp.email) {
					if (confirm_email) {
						sendmail.now(user, 'newemail', function (err) {
							if (err) {
								log.error("sendmail: " + inp.email + ": " + err);
								return done(null, inp, i18n.__("profile.err.GENERIC"));
							}
							log.info("Sent (newmail) mail: " + inp.email);
							return done(true, inp, i18n.__("profile.EMAILSENT"));
						});	
					}
					else {
						user.setEmail (inp.email, function (err) {
							if (err) {
								log.error("setEmail: Failed for " + user.info);
								return done(null, inp, i18n.__("profile.err.GENERIC"));
							}
							log.info("setEmail: Passed for " + user.info);
							return done(true, inp, i18n.__("profile.UPDATED"));
						});
					}
				}
				else {
					log.info("Account Update: " + user.info);
					return done(true, inp, i18n.__("profile.UPDATED"));
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
			if (faults) return done(null, '', i18n.__("profile.err.PASSWORD"));
	
			bcrypt.hash(inp.password, rounds, function(err, hash) {			
				if (err) {
					log.error("profile: bcrypt error");
					return done(null, '', i18n.__("profile.err.GENERIC"));
				} else {
					user.setPassword (hash, function (err) {
						if (err) {
							log.error("setPassword: Failed for " + user.info);
							return done(null, '', i18n.__("profile.err.GENERIC"));
						} 
						else {
							log.info("setPassword: for " + user.info);
							return done(true, '', i18n.__("profile.DONE"));
						}
					});
				}
			});	
			
        break;
		
		case 'profile':
		
			user.setProfile (inp, function (err) {
				if (err) {
					log.error("setProfile: Failed for " + user.id);
					return done(null, inp, i18n.__("profile.err.GENERIC"));
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
					return done(null, inp, i18n.__("profile.err.GENERIC"));
				} 
				else {
					log.info("setProfile: for " + user.id);
					return done(true, null, i18n.__("profile.UPDATED"));
				}
			});
			
        break;
		
		default:
			return done(null, inp, i18n.__("profile.err.NOFORM"));
	}
}

exports.setEmail = function(user, done) {
	user.setEmail (null, function (err) {
		if (err) {
			log.error("setEmail: Failed for " + user.info);
			return done(null, i18n.__("profile.err.GENERIC"));
		}
		log.info("setEmail: Passed for " + user.info);
		return done(true, i18n.__("profile.UPDATED"));
	});
}
	
exports.upload = function(user, file, done) {
	
	let suffix = file.name.split(".").pop();											// get suffix
	let new_avatarPath = '/avatar/' + 'new_' + user.id + '.' + suffix;					// temporary before crop
	let abs_avatarPath = path.resolve(appdir + '/public' + new_avatarPath);				// absolute path for saving file
	
	file.mv(abs_avatarPath, function(err) {
		if (err) {
			log.error("avatar: " + err);
			return done(i18n.__("profile.err.AVATAR"));
		}
		else {
			jimp.read(abs_avatarPath, function (err, image) {					
				if (err) {
					log.error("jimp.read: " + err);
					return done(i18n.__("profile.err.AVATAR"));
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
			return done(i18n.__("profile.err.AVATAR"));
		}
		else {
			jimp.read(newImagePath, function (err, image) {					
				if (err) {
					log.error("jimp.read: " + err);
					return done(i18n.__("profile.err.AVATAR"));
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



