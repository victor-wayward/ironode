
// --- Logger Module ---

// defines three log files under appdir/logs (winston)
// exports logger object
// node.js log levels: { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
// info.log: levels 0, 1, 2
// error.log: level 0
// exceptions.log: unhandled exceptions
// remember to rotate the log files yourself


const path = require('path');
const appdir = require('app-root-dir').get();
const dateformat = require('dateformat');
const winston = require('winston');

module.exports = new (winston.Logger)({
    transports: [
        new (winston.transports.File)({
            level: 'info',
			name: 'info-file',
			filename: path.resolve(appdir + '/logs/info.log'),
			json: false,
			timestamp: function () {
				return dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss");
			}
        }),
        new (winston.transports.File)({
            level: 'error',
			name: 'error-file',
            filename: path.resolve(appdir + '/logs/error.log'),
			json: false,
			timestamp: function () {
				return dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss");
			}
        })
	],
	exceptionHandlers: [
	    new (winston.transports.File)({
            filename: path.resolve(appdir + '/logs/exceptions.log'),
			handleExceptions: true,
            humanReadableUnhandledException: true,
			json: false,
			timestamp: function () {
				return dateformat(Date.now(), "yyyy-mm-dd HH:MM:ss");
			}
        }),
    ]
});



