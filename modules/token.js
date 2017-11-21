
// --- Token Controller ---

// finds user and checks token validity
// returns user object on success, error message on failure 


const log = require('logger');					// create logger (modules/logger.js)
const User = require('user');					// use user model (modules/user.js)
const i18n = require('translation');			// use translation middleware

module.exports = function(username, token, done) {
	
	if (!(username && token)) {
		log.error("Token: missing data");
		return done(i18n.__("token.err.GENERIC"));
	}
	
	User.findUser(username, function(err, user) {
		if (err) {
			log.error("Token: User does not exist: " + username);
			return done(i18n.__("token.err.BADUSER"));
		}
	
		user.checkToken(token, function (err) {
			if (err) { 
				log.error("Token: Failed for " + user.info + " : " + err);
				return done(i18n.__("token.err.BADTOKEN"));
			} 
			
			log.info("Token: Passed for " + user.info);
			return done(null, user);			
		});
	});	
}	




