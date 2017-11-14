
// --- MongoDB Handler ---

// defines mongodb connection (mongoose driver)
// exports mongoose instance (db handler)


const config = require('config');							// read configuration
const log = require('logger');								// create logger

const options = {
	useMongoClient: true,
	autoIndex: false, 										// don't rebuild indexes
	reconnectTries: 3, 										// retry to reconnect
	reconnectInterval: 1000,								// every 1s
	poolSize: 10, 											// maintain up to 10 socket connections
	bufferMaxEntries: 0										// if not connected, return errors immediately	
};

// mongodb connection
const dbURI = config.get('server.db-uri');
db = require('mongoose');
db.Promise = global.Promise; 								// set promise lib for mongoose
db.connect(dbURI, options);

// events related to mongodb connection
db.connection.on('connected', function () {
	log.info('Connected to ' + dbURI);
});
db.connection.on('error', function (err) {
	throw err;												// unhandled exception
	process.exit(1);
});
db.connection.on('disconnected', function () {
	log.info('Disconnected from ' + dbURI);
});

// close connection on application termination
process.on('SIGINT', function() {
	log.info('SIGINT');
	db.connection.close(function () {
		console.log('Disconnected from ' + dbURI + ' (application interrupted)');
		process.exit(0);
	});
});
process.on('SIGTERM', function() {
	log.info('SIGTERM');
	db.connection.close(function () {
		console.log('Disconnected from ' + dbURI + ' (application terminated)');
		process.exit(0);
	});
});

module.exports = db;