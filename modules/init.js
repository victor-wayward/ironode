
// --- Initialization ---

// Libs like bootstrap, jquery, socket.io & jcrop
// better be placed to the public folder for client access


const path = require('path');						// unix/dos path resolver
const appdir = require('app-root-dir').get();		// returns app path
const fs = require('fs.extra');						// file system methods
 
module.exports = function(done) {
	
	let target = '/public/ext/';
	
	const files2copy = [
		'/node_modules/bootstrap/dist/css/bootstrap.min.css',
		'/node_modules/jquery-jcrop/css/jquery.Jcrop.min.css',
		'/node_modules/bootstrap/dist/js/bootstrap.min.js',
		'/node_modules/jquery/dist/jquery.min.js',
		'/node_modules/socket.io-client/dist/socket.io.js',
		'/node_modules/jquery-jcrop/js/jquery.Jcrop.min.js',
		'/node_modules/popper.js/dist/umd/popper.min.js',
		'/public/img/Jcrop.gif'
	]
	
	for (var i = 0; i < files2copy.length; i++) {
		let filename = files2copy[i].split('/').pop();
		fs.copy(
			path.resolve(appdir + files2copy[i]), 
			path.resolve(appdir + target + filename), 
			{ overwrite: true }, 
			function(err, file) {
				if (err) return done('server.fs.copy: ' + err);
		});
	}

	return done();
}

