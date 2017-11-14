
// --- User Model ---

// interacts with db, defines user schema, provides user methods
// two kinds of methods:
// statics: methods defined on the schema itself (e.g findUserById is a schema bound method)
// methods: methods defined on the instance (e.g setPassword is specific to single user instance)

const db = require('db');				// create db connection
const moment = require('moment');		// date/time manipulation lib
const crypto = require('crypto');		// crypto lib to create tokens (links on email validation, password reset)

// --- User Schema ---

var userSchema = new db.Schema({
	
	username: { type: String, required: true, unique: true },
	email: { type: String, required: true, unique: true, index: true },
	password: { type: String, required: true },
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

// --- Virtual Property ---

userSchema.virtual('info').get(function() {  
    return '[' + this.id + '] ' + this.username + ' (' + this.email + ')';
});

// --- Static Methods ---

// find user by username or email
// calls done with error string or user object
userSchema.statics.findUser = function(who, done) {
	
	var query;
	
	who.includes('@') ? 
		query = this.where({ 'email': who }) :
		query = this.where({ 'username': who });

	query.findOne(function (err, user) {
		if (err) return done('db(findUser): ' + err);
		if (!user) return done(null, null);
		else return done(null, user);
	});
}

// find user by ID 
// calls done with error string or user object
userSchema.statics.findUserById = function(id, done) {
	
	this.findById(id).exec(done(err, user));
}


// --- Instance Methods ---

// update user login data on successful login
// calls done with error string or null
userSchema.methods.loginUser = function(done) {
	
	this.login.last = Date.now();
	this.login.counter += 1;
	this.login.fault.last = 0;
	this.login.fault.counter = 0;
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
	authToken = crypto.createHash('sha256').update(seed + this.email).digest('hex');  
		
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
	
	this.login.enabled = true;
	this.login.createdOn = Date.now();
	this.login.authToken = null;
	this.save(function (err) {
		if (err) return done('save: ' + err);
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
	
	return done(null);
}

// set user email
// calls done with error string or null
userSchema.methods.setEmail = function(done) {

	this.old_emails.unshift(this.email);
	this.email = this.newemail.email;
	this.newemail.email = null;
	this.newemail.authToken = null;	
	this.save(function (err) {
		if (err) return done('save: ' + err);
	});
	
	return done(null);
}

// set user email
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
		authToken = crypto.createHash('sha256').update(seed + this.email).digest('hex');  
			
		this.newemail.authToken = 'e' + authToken; // e to indicate token for email change
		this.newemail.createdOn = Date.now();
		this.newemail.counter += 1;
		this.newemail.email = account.email;
	}

	this.save(function (err) {
		if (err) return done('save: ' + err);
	});
	
	return done(null);
}



userSchema.methods.setProfile = function(profile, done) {

	this.profile.name = profile.name;
	this.profile.surname = profile.surname;

	this.save(function (err) {
		if (err) return done('save: ' + err);
	});
	
	return done(null);
}

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












/*
userSchema.statics.findUser = function(who, done) {
	
	var query;
	
	console.log(who);
	
	who.includes('@') ? 
		query = this.where({ 'email': who }) :
		query = this.where({ 'username': who });

	console.log(query);
	
	query.findOne(function (err, user) {
		if (err) return done('findUser: ' + err);
		if (!user) return done(null, null);
		else return done(null, user);
	});
}

	User.findOne({ 'username': who }, '', function (err, user) {
		if (err) return done('findUser: ' + err);
		if (!user) return done(null, null);
		return done(null, user);
	});
*/

// middleware (pre hook plugin) for hashing password before save
/*
userSchema.pre('save', function(next) {

	const secret = config.get('reg.secret');
	this.password = crypto.createHash('sha256').update(secret + this.password).digest('hex'); 

	next();
});



*/

/*userSchema.statics.loginUser = function(email, done) {
	
	User.findOneAndUpdate(
		{ 'email': email }, 
		{ 
			$set: { 'login.last': Date.now() }, 
			$inc: { 'login.counter': 1 }  
		},
		function (err, res) {
			if (err) return done('loginUser: ' + err); 
			if (!res) return done('loginUser: ' + email + ' not found');
			else return done(null);
		}
	);	
}*/
