
// --- Contact Controller ---

// validates contact form fields, checks google response, saves text to logs/messages.log
// returns status and a message
// on error returns also the input form


const path = require('path');					// unix/dos path resolver
const appdir = require('app-root-dir').get();	// get app path
const log = require('logger');					// create logger (modules/logger)
const User = require('user');					// use user model (modules/user)
const validate = require('validation');			// use validation helpers (modules/user)
const i18n = require('translation');			// use translation middleware
const moment = require('moment-timezone');;		// date/time manipulation lib (with timezone)
const https = require('https');					// https module
const fs = require('fs');						// file system functions

const config = require('config');				// read configuration (app/config)
const captcha_secret = config.get('site.captcha.google-secret');
const timezone = config.get('server.timezone');

function save2file(form) {
	const logger = fs.createWriteStream(path.resolve(appdir + '/logs/messages.log'), { flags: 'a' });
	logger.write('Date: ' + moment().tz(timezone).format('MMMM Do YYYY, HH:mm:ss') + '\n');
	logger.write('Name: ' + form.name + '\n');
	logger.write('Email: ' + form.email + '\n');
	logger.write(form.text + '\n\n\n');
	logger.end();
}
	
exports.contact = function(form, show, done) {
	
	log.info("Contact request: " + JSON.stringify(form));
	
	if (form.name + form.email + form.text === '') return done(null, form, i18n.__("contact.err.BLANK"));
	
	var faults = 0;
	validate.cname(form.name, function(status) {
		if (!status) faults++;
	});
	validate.cemail(form.email, function(status) {
		if (!status) faults++;
	});
	validate.ctext(form.text, function(status) {
		if (!status) faults++;
	});
	if (faults) {
		log.error("contact: validation faults");
		return done(null, form, i18n.__("contact.err.GENERIC"));
	}
	
	if ((!form["g-recaptcha-response"]) && show) return done(null, form, i18n.__("contact.err.UROBOT"));
	
	if (show) {
		const verlink = "https://www.google.com/recaptcha/api/siteverify?secret=" + captcha_secret + "&response=" + form["g-recaptcha-response"];
		https.get(verlink, function(res) {
			
			let data = "";
			res.on('data', function (chunk) {
				data += chunk.toString();
			});
			res.on('end', function() {
				try {
					let google_response = JSON.parse(data);
					if (google_response.success) {
						save2file(form);
						return done(true, null, i18n.__("contact.SUCCESS"));	
					}
					log.error("contact: Robot approaching");
					return done(null, form, i18n.__("contact.err.UROBOT"));
					
				} catch (err) {
					log.error("contact:" + JSON.stringify(err));
					return done(null, form, i18n.__("contact.err.SYSERROR"));
				}
			});
		}).on('error', function(err) {
			log.error("contact: " + JSON.stringify(err));
			return done(null, form, i18n.__("contact.err.NOHTTPS"));
		});
	}
	else {
		save2file(form);
		return done(true, null, i18n.__("contact.SUCCESS"));	
	}
}	
