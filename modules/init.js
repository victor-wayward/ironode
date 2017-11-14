
// --- Initialization ---

// Libs like bootstrap, jquery, socket.io & jcrop
// bettr be placed to the public folder for client access


const path = require('path');						// unix/dos path resolver
const appdir = require('app-root-dir').get();		// returns app path
const fs = require('fs.extra');						// file system methods

module.exports = function(done) {
	fs.copy(
		path.resolve(appdir + '/node_modules/bootstrap/dist/css/bootstrap.min.css'), 
		path.resolve(appdir + '/public/ext/bootstrap.min.css'), 
		{ overwrite: true }, 
		function(err, file) {
			if (err) return done('server.fs.copy: ' + err);
	});	
	fs.copy(
		path.resolve(appdir + '/node_modules/jquery-jcrop/css/jquery.Jcrop.min.css'), 
		path.resolve(appdir + '/public/ext/jquery.Jcrop.min.css'), 
		{ overwrite: true },
		function(err, file) {
			if (err) return done('server.fs.copy: ' + err);
	});	
	fs.copy(
		path.resolve(appdir + '/node_modules/bootstrap/dist/js/bootstrap.min.js'), 
		path.resolve(appdir + '/public/ext/bootstrap.min.js'), 
		{ overwrite: true },
		function(err, file) {
			if (err) return done('server.fs.copy: ' + err);
	});	
	fs.copy(
		path.resolve(appdir + '/node_modules/jquery/dist/jquery.min.js'), 
		path.resolve(appdir + '/public/ext/jquery.min.js'),
		{ overwrite: true },		
		function(err, file) {
			if (err) return done('server.fs.copy: ' + err);
	});	
	fs.copy(
		path.resolve(appdir + '/node_modules/socket.io-client/dist/socket.io.js'), 
		path.resolve(appdir + '/public/ext/socket.io.js'),
		{ overwrite: true },
		function(err, file) {
			if (err) return done('server.fs.copy: ' + err);
	});	
	fs.copy(
		path.resolve(appdir + '/node_modules/jquery-jcrop/js/jquery.Jcrop.min.js'), 
		path.resolve(appdir + '/public/ext/jquery.Jcrop.min.js'),
		{ overwrite: true },
		function(err, file) {
			if (err) return done('server.fs.copy: ' + err);
	});	
	fs.copy(
		path.resolve(appdir + '/node_modules/tether/dist/js/tether.min.js'), 
		path.resolve(appdir + '/public/ext/tether.min.js'),
		{ overwrite: true },
		function(err, file) {
			if (err) return done('server.fs.copy: ' + err);
	});		
	return done();
}

