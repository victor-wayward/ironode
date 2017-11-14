
// --- Validation Helper Functions ---

// callback 'done' functions are called with status and error/message string
// validation helpers are called by the socket module on form input change
// also, on form submit, by the various controllers


var User = require('user');					// use user model
var validator = require('validator');		// use validator
var i18n = require('translation');			// use translation middleware


// registration - validates a new username
// if an id is provided, it checks if it matches the username (used for username alteration)
exports.username = function (inp, done, id) {
	
	if (validator.isEmpty(inp)) return done(false, i18n.__("register.err.REQUIRED"));
	if (validator.isLength(inp, {max: 5})) return done(false, i18n.__("register.err.NUMCHARS")); 
	if (!validator.matches(inp, /^[a-z0-9_]+$/i)) return done(false, i18n.__("register.err.SPECIALCHARS")); 
	
	User.findUser(inp, function(err, user) {
		if (err) return done(false, i18n.__("register.err.SYSERROR"));	
		if (user === null) return done(true, '');
		if (id) {
			if (user.id == id) return done(true, '');
			return done(false, i18n.__("register.err.UALREADY"));
		}
		return done(false, i18n.__("register.err.UALREADY"));
	});
}

// registration - validates a new email address
// if an id is provided, it checks if it matches the email (used for email alteration)
exports.email = function (inp, done, id) {

	if (validator.isEmpty(inp)) return done(false, i18n.__("register.err.REQUIRED"));
	if (!validator.isEmail(inp)) return done(false, i18n.__("register.err.EVALID"));
	
	User.findUser(inp, function(err, user) { 
		if (err) return done(false, i18n.__("register.err.SYSERROR"));	
		if (user === null) return done(true, '');		
		if (id) {
			if (user.id == id) return done(true, '');
			return done(false, i18n.__("register.err.EALREADY"));
		}
		return done(false, i18n.__("register.err.EALREADY"));
	});
}

// registration - validates a new password
exports.password = function (inp, done) {

	if (validator.isEmpty(inp)) return done(false, i18n.__("register.err.REQUIRED"));
	if (validator.isLength(inp, {max: 5})) return done(false, i18n.__("register.err.NUMCHARS")); 
	return done(true, '');
}

// registration - validates a new password verification (passwords are entered twice)
exports.verify = function (inp, done) {

	if (validator.isEmpty(inp.verify)) return done(false, i18n.__("register.err.REQUIRED"));
	if (!validator.equals(inp.password, inp.verify)) return done(false, i18n.__("register.err.PMATCH"));
	return done(true, '');
}

// password reset - validates an email address upon request for password reset
exports.email2reset = function (inp, done) {

	if (validator.isEmpty(inp)) return done(false, i18n.__("reset.err.REQUIRED"));
	if (!validator.isEmail(inp)) return done(false, i18n.__("reset.err.EVALID"));
	
	User.findUser(inp, function(err, user) {
		if (err) return done(false, i18n.__("reset.err.SYSERROR"));	
		if (user === null) return done(false, i18n.__("reset.err.NOTEXIST"));
		else return done(true, i18n.__("reset.EXISTS"), user);
	});
}

// contact - validates name
exports.cname = function (inp, done) {
	
	if (validator.isEmpty(inp)) return done(false, i18n.__("contact.err.REQUIRED"));
	return done(true, '');
}

// contact - validates email
exports.cemail = function (inp, done) {

	if (validator.isEmpty(inp)) return done(false, i18n.__("contact.err.REQUIRED"));
	if (!validator.isEmail(inp)) return done(false, i18n.__("contact.err.EVALID"));
	return done(true, '');
}

// contact - validates text
exports.ctext = function (inp, done) {
	if (validator.isEmpty(inp)) return done(false, i18n.__("contact.err.REQUIRED"));
	return done(true, '');
}

