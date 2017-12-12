
// --- User Model ---

// interacts with db, defines user schema, provides user methods
// two kinds of methods
// statics: methods defined on the schema itself (e.g findUserById is a schema bound method)
// methods: methods defined on the instance (e.g setPassword is specific to single user instance)

const db = require('db');				// create db connection
const moment = require('moment');		// date/time manipulation lib
const crypto = require('crypto');		// crypto lib to create tokens (links on email validation, password reset)

// --- User Schema ---

var userSchema = new db.Schema({
	
	username: { type: String, trim: true, sparse: true},
	email: { type: String, sparse: true, trim: true, lowercase: true, index: true },
	password: { type: String },
	group: { type: String, default: 'user' },
	
	login: { 
		createdOn: { type: Date, default: Date.now() },
		last: { type: Date, default: Date.now() },
		counter: { type: Number, default: 0 },
		enabled: { type: Boolean, default: false },
		authToken: String,
		fault: {
			last: { type: Date, default: 0 },
			counter: { type: Number, default: 0 },
		},
	},
	
	social: {
		facebook: {
 			id: { type: String, sparse: true, index: true },
 			email: { type: String, lowercase: true },
			name: String,
			surname: String,
 			last: { type: Date, default: Date.now() },
			counter: { type: Number, default: 0 },
			createdOn: { type: Date, default: Date.now() }
 		},
		google: {
 			id: { type: String, sparse: true, index: true },
			email: { type: String, lowercase: true },
			name: String,
			surname: String,
 			last: { type: Date, default: Date.now() },
			counter: { type: Number, default: 0 },
			createdOn: { type: Date, default: Date.now() }
 		},
		linkedin: {
 			id: { type: String, sparse: true, index: true },
			email: { type: String, lowercase: true },
			name: String,
			surname: String,
 			last: { type: Date, default: Date.now() },
			counter: { type: Number, default: 0 },
			createdOn: { type: Date, default: Date.now() }
 		}
 	},
 
	reset: { 
		authToken: String,
		createdOn: { type: Date, default: Date.now() },
		counter: { type: Number, default: 0 }
	},
	
	newemail: { 
		email: String,
		createdOn: { type: Date, default: Date.now() },
		counter: { type: Number, default: 0 },
		authToken: String,
	},
	
	profile: {
		name: String,
		surname: String,
		avatar: { type: String, default: '/img/avatar.jpg' },
		avatarChecked: { type: Boolean, default: false },
	},
	
	address: {
		line1: String,
		line2: String,
		city: String,
		region: String,
		country: String,
		postcode: String,
	},
	
	old_usernames: [String],
	old_emails: [String],
	
});

// --- Virtual Properties ---

userSchema.virtual('info').get(function() {  
    return '[' + this.id + '] ' + this.username + ' (' + this.email + ')';
});
userSchema.virtual('finfo').get(function() {  
    return '[' + this.social.facebook.id + '] ' + this.social.facebook.surname + ' (' + this.social.facebook.email + ')';
});
userSchema.virtual('ginfo').get(function() {  
    return '[' + this.social.google.id + '] ' + this.social.google.surname + ' (' + this.social.google.email + ')';
});
userSchema.virtual('linfo').get(function() {  
    return '[' + this.social.linkedin.id + '] ' + this.social.linkedin.surname + ' (' + this.social.linkedin.email + ')';
});

// --- Static Methods ---

// find user by username or email
// calls done with error string or user object
userSchema.statics.findUser = function(who, done) {
	
	var query = who.includes('@') ? this.where({ 'email': who.toLowerCase() }) : this.where({ 'username': who });

	query.findOne(function (err, user) {
		if (err) return done('db(findUser): ' + err);
		if (!user) return done(null, null);
		else return done(null, user);
	});
}

// find user by ID 
// calls done with error string or user object
userSchema.statics.findUserByID = function(id, done) {
	
	this.findById(id).exec(done(err, user));
}

// find user by facebook ID (or try to match user by email)
// calls done with error string or user object
userSchema.statics.findUserByFacebookID = function(id, email, done) {
	
	this.findOne({
		$or: [
			{ 'social.facebook.id': id },
			{ 'email': email },
			{ 'social.google.email': email },
			{ 'social.linkedin.email': email }
		]},
		function (err, user) {
			return done(err, user);
	});
}

// find user by google ID (google does not provide email)
// calls done with error string or user object
userSchema.statics.findUserByGoogleID = function(id, email, done) {
	
	this.findOne({
		$or: [
			{ 'social.google.id': id },
			{ 'email': email },
			{ 'social.facebook.email': email },
			{ 'social.linkedin.email': email }
		]},
		function (err, user) {
			return done(err, user);
	});
}

// find user by linkedin ID (google does not provide email)
// calls done with error string or user object
userSchema.statics.findUserByLinkedInID = function(id, email, done) {
	
	this.findOne({
		$or: [
			{ 'social.linkedin.id': id },
			{ 'email': email },
			{ 'social.facebook.email': email },
			{ 'social.google.email': email }
		]},
		function (err, user) {
			return done(err, user);
	});
}

// find user by social email and remove it 
// since its data have to be moved to the main account
// calls done with error string or user object
userSchema.statics.moveSocial = function(email, done) {
	
	this.findOneAndRemove({
		$or: [
			{ 'social.facebook.email': email },
			{ 'social.google.email': email },
			{ 'social.linkedin.email': email }
		]},
		function (err, user) {
			return done(err, user);
	});
}

// --- Instance Methods ---

// update user login data on successful login depending on method
// calls done with error string or null
userSchema.methods.loginUser = function(method, profile, done) {
	
	if (method == 'local') {		
		this.login.last = Date.now();
		this.login.counter += 1;
		this.login.fault.last = 0;
		this.login.fault.counter = 0;
	}
	else {
		this.social[method].id = this.social[method].id || profile.id;
		this.social[method].email = profile.emails[0].value;
		this.social[method].name = profile.name.givenName;
		this.social[method].surname = profile.name.familyName;
		this.profile.name = this.profile.name || profile.name.givenName;
		this.profile.surname = this.profile.surname || profile.name.familyName;
		this.social[method].last = Date.now();
		this.social[method].counter += 1;
	}
		
	this.save(function (err) {
		if (err) return done('db(save): ' + err);
	});
	
	return done(null);
}

// update user fault login data on failed login
// calls done with error string or null
userSchema.methods.badloginUser = function(done) {
	
	this.login.fault.last = Date.now();
	this.login.fault.counter += 1;
	if (this.login.fault.counter > 100) this.login.enabled = false;
	this.save(function (err) {
		if (err) return done('db(save): ' + err);
	});
	
	return done(null);
}

// initiate password reset
// calls done with error string or null
userSchema.methods.resetUser = function(done) {

	if (this.reset.counter > 10) return done('toomany');
	if (moment().diff(moment(this.reset.createdOn), 'seconds') < this.reset.counter * 60) return done('toosoon');
	
	const seed = crypto.randomBytes(20);
	const authToken = crypto.createHash('sha256').update(seed + this.email).digest('hex');  
		
	this.reset.authToken = 'p' + authToken;
	this.reset.createdOn = Date.now();
	this.reset.counter += 1;
	this.save(function (err) {
		if (err) return done('save: ' + err);
	});
	
	return done(null);
}

// check token and token age
// calls done with error string or null
userSchema.methods.checkToken = function(token, done) {

	switch(token.charAt(0)) {		
		case 'r':
			var tokenAge = moment().diff(moment(this.login.createdOn), 'minutes');
			var stored = this.login.authToken;
        break;
		case 'p':
			var tokenAge = moment().diff(moment(this.reset.createdOn), 'minutes');
			var stored = this.reset.authToken;
        break;
		case 'e':
			var tokenAge = moment().diff(moment(this.newemail.createdOn), 'minutes');
			var stored = this.newemail.authToken;
		break;	
		default:
			return done('uknown type');
	}
	
	if (stored !== token) return done('wrong token');
	if (tokenAge > 60) return done('expired token');	
	return done(null);
}

// enable user
// calls done with error string or null
userSchema.methods.enable = function(done) {
	
	let newuser = this;
	
	this.login.enabled = true;
	this.login.createdOn = Date.now();
	this.login.authToken = null;
	
	User.moveSocial(this.email, function (err, user) {
		if (err) return done('move: ' + err);
		if (user) newuser.social = user.social;

		newuser.save(function (err) {
			if (err) return done('save: ' + err);
		});
	});
	
	return done(null);
}

// set user password
// calls done with error string or null
userSchema.methods.setPassword = function(password, done) {

	this.password = password;
	this.reset.authToken = null;	
	this.save(function (err) {
		if (err) return done('save: ' + err);
	});
	this.lateEnable(function (err) {
		if (err) return done('save: ' + err);
	});

	return done(null);
}

// set user email (directly if email is passed or from newemail)
// calls done with error string or null
userSchema.methods.setEmail = function(email, done) {
	
	this.old_emails.unshift(this.email);
	this.email = (email) ? email : this.newemail.email;
	this.newemail.email = null;
	this.newemail.authToken = null;	
	this.save(function (err) {
		if (err) return done('save: ' + err);
	});
	this.lateEnable(function (err) {
		if (err) return done('save: ' + err);
	});
	
	return done(null);
}

// enable direct login, user has performed social login and filled in registration data
// calls done with true/false and message string
userSchema.methods.lateEnable = function(done) {
	
	if (this.username && this.email && this.password) {
		this.login.enabled = true;
		this.login.createdOn = Date.now();
		this.login.authToken = null;
		this.save(function (err) {
			if (err) return done(false, 'save: ' + err);
		});
		return (true)
	}	
	
	return done(false);
}

// set user username and email (newemail for now)
// calls done with error string or null
userSchema.methods.setAccount = function(account, done) {

	if (this.username != account.username)
	{
		this.old_usernames.unshift(this.username);
		this.username = account.username;
	}

	if (this.email != account.email)
	{	
		const seed = crypto.randomBytes(20);
		const authToken = crypto.createHash('sha256').update(seed + this.email).digest('hex');  
		this.newemail.authToken = 'e' + authToken; 
		this.newemail.createdOn = Date.now();
		this.newemail.counter += 1;
		this.newemail.email = account.email;
	}

	this.save(function (err) {
		if (err) return done('save: ' + err);
	});
	this.lateEnable(function (err) {
		if (err) return done('save: ' + err);
	});
	
	return done(null);
}

// set user name
// calls done with error string or null
userSchema.methods.setProfile = function(profile, done) {

	this.profile.name = profile.name;
	this.profile.surname = profile.surname;
	this.save(function (err) {
		if (err) return done('save: ' + err);
	});
	
	return done(null);
}

// set user address
// calls done with error string or null
userSchema.methods.setAddress = function(address, done) {

	this.address.line1 = address.line1,
	this.address.line2 = address.line2,
	this.address.city = address.city,
	this.address.region = address.region,
	this.address.country = address.country,
	this.address.postcode = address.postcode,
	this.save(function (err) {
		if (err) return done('save: ' + err);
	});
	
	return done(null);
}

// set user avatar
// calls done with error string or null
userSchema.methods.setAvatar = function(avatar, done) {

	this.profile.avatar = avatar;
	this.profile.avatarChecked = false;
	this.save(function (err) {
		if (err) return done('save: ' + err);
	});
	
	return done(null);
}

// User model (class name, schema, db collection) 
var User = db.model('User', userSchema, 'users');
module.exports = User;

