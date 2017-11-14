
// --- Routing Controller ---

// routes http requests to the various endpoints
// exports the router object
// app.get accepts a path and a callback that can be a series of functions separated by commas
// res.render accepts a view, optional local variables (e.g. user) and a callback

const log = require('logger');						// create logger
const express = require('express');					// express application
const router = express.Router();					// express router
const passport = require('authentication');			// authentication module (app/modules/authentication)
const register = require('registration');			// registration module (app/modules/registration)
const reset = require('reset');						// password reset module (app/modules/reset)
const contact = require('contact');					// contact module (app/modules/contact)
const profile = require('profile');					// profile module (app/modules/profile)
const token = require('token');						// token module (app/modules/token)

const config = require('config');
const captcha_users = (config.get('contact.captcha.users') == 'true');
const captcha_guests = (config.get('contact.captcha.guests') == 'true');
const captcha_key = config.get('contact.captcha.google-key');

const ccemail = (config.get('register.can_change_email') == 'true');
const ccuname = (config.get('register.can_change_username') == 'true');
const disabled = ((ccemail || ccuname) == 'false') ? true : false;

const fileUpload = require('express-fileupload');	// used for avatar
router.use(fileUpload({
	safeFileNames: /\\/g, 							// strip slashes from filenames
	limits: { fileSize: 1 * 1024 * 1024 }  			// 1MB
}));

// use flash messages (populates req.flash) 
const flash = require('connect-flash');
router.use(flash());

// form data middleware, populates req.body with form data
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));

// sanitize, prevent mongodb operator injection (use right after body-parser)
const dbsanitize = require('express-mongo-sanitize');
router.use(dbsanitize({ replaceWith: '_' }));

// middleware to traverse req.body properties and strip unsafe tags from post requests 
const sanitizer = require('sanitizer');
router.post('*', function(req, res, next) {
	for(var key in req.body) {
		if (req.body.hasOwnProperty(key)) req.body[key] = sanitizer.sanitize(req.body[key]);
	}
	next();
});

// --- Home ---

router.get('/', function(req, res) {
	res.render('home', { 
		info: req.flash('info'),
		error: req.flash('error'), 
	});
});

// --- Registration Form ---

router.get('/register', function(req, res) {
	res.render('register', { 
		error: req.flash('error') 
	});
});

router.post('/register', function(req, res) {	
	register.register(req.body, function(user, xform, msg) {
		if (user) {														// successfull registration
			if (user.login.enabled) {									// auto login after registration	
				req.login(user, function (err) {						// passport login without authentication
					if (err) log.error('req.login: ' + err);			// serializer error
				});
			}
			req.flash('info', msg);										// flash info message
			res.redirect('/');
		}
		else {															// registration fails
			req.flash('error', msg);									// flash error message
			res.render('register', {
				xform: req.body, 										// pass back form data
				error: req.flash('error') 								// flash error
			}); 				
		}
	});
});

// --- Login ---

router.get('/login', function(req, res) {
	res.render('login', { 
		error: req.flash('error') 
	});
});

router.post('/login', passport.authenticate('local', { 
	successRedirect: '/',
	failureRedirect: '/login',
	failureFlash: true 
}));

// --- Logout ---

router.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});

// --- Password Reset ---

router.get('/reset', function(req, res) {
	res.render('reset', { 
		defmsg: true													// pass a var to indicate default msg is displayed
	});
});

router.post('/reset', function(req, res) {
	reset.reset(req.body.email, function(email, xform, msg) {
		if (email) {
			req.flash('info', msg + email);								// flash info message
			res.redirect('/');	
		}
		else {
			req.flash('error', msg);									// flash error message
			res.render('reset', { 										// pass back
				xform: req.body,										// form data and
				error: req.flash('error') 								// error
			});
		}
	});
});

// --- Contact Form ---

router.get('/contact', function(req, res) {		
	let show = ((captcha_users && req.user) || (captcha_guests && !req.user)) ? true : false;
	res.render('contact', { 
		show: show,														// indicate if captcha should be displayed
		key: captcha_key												// google key
	});
});

router.post('/contact', function(req, res) {		
	let show = ((captcha_users && req.user) || (captcha_guests && !req.user)) ? true : false;
	contact.contact(req.body, show, function(result, xform, msg) {
		if (result)	{
			req.flash('info', msg);										// flash message
			res.redirect('/');	
		} 
		else {
			req.flash('error', msg);									// flash error message
			delete req.body["g-recaptcha-response"];					// a new response is needed
			res.render('contact', { 									// pass back ...
				xform: req.body, 										// form data
				error: req.flash('error'),								// error
				show: show,												// indicate if captcha should be displayed
				key: captcha_key										// google key
			}); 
		}
	});
});

// --- Token ---

router.get('/token/:user/:token', function(req, res) {
	token(req.params.user, req.params.token, function(err, user) {
		if (err) {			
			req.flash('error', err);
			res.redirect('/');
		}
		
		switch(req.params.token.charAt(0)) {	
		case 'r':														// registration
			register.activate(user, function(result, msg) {  			// login user explicitly
				if (result) {
					req.flash('info', msg);
					req.login(user, function (err) {					// passport login - no authentication
						if (err) log.error('req.login: ' + err);		// serializer error?
					});
				}
				else req.flash('error', msg);	
				res.redirect('/');
			});
		break;	
		case 'p':														// forgot password
			res.render('password', { 
				who: req.params.user,
				token: req.params.token 
			});
		break;
		case 'e':														// change email address
			profile.setEmail(user, function(result, msg) {
				if (result) req.flash('info', msg);
				else req.flash('error', msg);	
				res.redirect('/');
			});
		break;
		}
	});	
});

router.post('/token/:user/:token', function(req, res) {					// used for password reset
	token(req.params.user, req.params.token, function(err) {
		if (err) {
			req.flash('error', err);									// flash message
			res.redirect('/');		
		}
		
		req.body.username = req.params.user;
		reset.password(req.body, function(user, msg) {					
			if (user) {													// successfull reset
				req.login(user, function (err) {						// passport login
					if (err) log.error('req.login: ' + err);			// serializer error?
					else {
						req.flash('info', msg);							// flash message
						res.redirect('/');
					}	
				});
			} 
			else {														// registration fails
				req.flash('error', msg);								// flash error message
				res.render('password', { 
					who: req.params.user, 
					token: req.params.token, 
					error: req.flash('error') 
				});
			}
		});
	});
});

// --- Profile ---

router.get('/profile', function(req, res) {	
	if (req.user) {
		res.render('profile', { 
			ccuname: ccuname, 
			ccemail: ccemail, 
			disabled: disabled, 
			active: { 'account' : 'active' }
		});
	}
	else res.status(400).render('404');
});

router.post('/profile/upload', function(req, res) {
	
	if (!req.user) res.status(400).render('404');
	if (!req.files) return res.status(400).send('No files were uploaded.');

	profile.upload(req.user, req.files.newImage, function (err, newImageResized) {
		
		if (err) req.flash('error', err);
		res.render('profile', { 
			active: { 'profile' : 'active' },
			newimage: newImageResized,
			error: req.flash('error')
		});
	});
});

router.post('/profile/crop', function(req, res) {

	if (!req.user) res.redirect('/'); //404?? log unauthorized

	profile.crop(req.user, req.body, function (err) {
		if (err) req.flash('error', err);
		res.render('profile', { 
			active: { 'profile' : 'active' },
			avatar: req.user.profile.avatar,
			error: req.flash('error')
		});
	});
});

router.post('/profile/:form', function(req, res) {	
	if (req.user) {
		profile.update(req.user, req.body, req.params.form, function(result, xform, msg) {
			if (result) req.flash('info', msg);
			else req.flash('error', msg);

			res.render('profile', { 
				change_email: change_email, 
				change_uname: change_uname, 
				disabled: disabled, 
				info: req.flash('info'), 
				error: req.flash('error'),
				active: { [req.params.form] : 'active' }
			});				
		});
	}
	else res.render('404');          
});

module.exports = router

