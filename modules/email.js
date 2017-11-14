
// --- Email Sender (SendPulse) ---

// gets an email address, a template name and sends an email
// returns true/false

const path = require('path');
const appdir = require('app-root-dir').get();
const config = require('config');					// read configuration (app/config)
const i18n = require('translation');				// use translation middleware

const sendpulse = require("sendpulse-api");
const user_id = config.get('email.sendpulse-id');
const secret = config.get('email.sendpulse-secret');
const token_storage = path.resolve(appdir + '/tmp/mail_');
sendpulse.init(user_id, secret, token_storage);

const sitename = config.get('site.name');
const siteurl = config.get('site.url');
const sitemail = config.get('site.email');

const emailTemplate = require('email-templates').EmailTemplate;

exports.now = function (user, type, done) { 

	const template = new emailTemplate(path.resolve(appdir + '/views/email_templates/' + type));

	switch(type) {		
		case 'register':
			var token = user.login.authToken;
			var recipient_name = user.username;
			var recipient_addr = user.email;
		break;	
		case 'reset':
			var token = user.reset.authToken;
			var recipient_name = user.username;
			var recipient_addr = user.email;
        break;
		case 'newemail':
			var token = user.newemail.authToken;
			var recipient_name = user.username;
			var recipient_addr = user.newemail.email;
		break;
		default:
			return done('uknown type');
	}
	
	var locals = {
		sitename: sitename,
		username: recipient_name,
		link: siteurl + "/token/" + user.username + "/" + token
	};
  
	template.render(locals, i18n.locale, function (err, result) {
		
		if (err) return done(err);

		var email = {
			"html": result.html,
			"text": result.text,
			"subject": result.subject,
			"from": {
				"name": sitename,
				"email": sitemail
			},
			"to": [{
				"name": recipient_name,
				"email": recipient_addr
			}]
		};
		
		sendpulse.smtpSendMail(function(ans) {	
			return (ans.result) ? done(null) : done(JSON.stringify(ans));
		}, email);
	});
}



/*

sendpulse.init(user_id, secret, token_storage);

var email = {
        "html" : i18n.__("reset.email.TITLE", { sitename: config.get('email.from.name'); }),
        "text" : "Example text",
        "subject" : "Example subject",
        "from" : {
            "name" : "farasi.gr",
            "email" : "support@farasi.gr"
        },
        "to" : [
            {
                "name" : "Victor",
                "email" : "victor.bechar@vodafone.com"
            },
        ]
};

module.exports = function(email, template, done) {
	
	sendpulse.smtpSendMail(done, email);
	
}

*/

/*
var email = {
        "html" : "<h1>Example text</h1>",
        "text" : "Example text",
        "subject" : "Example subject",
        "from" : {
            "name" : "farasi.gr",
            "email" : "support@farasi.gr"
        },
        "to" : [
            {
                "name" : "Victor",
                "email" : "victor.bechar@vodafone.com"
            },
        ]
};
*/	
