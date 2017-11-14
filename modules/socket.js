
// Note: check if you can further integrate it

// --- Socket Controller ---

// socket handler
// socket.io replaces ajax calls (good stuff)
// as it stands, sockets are used for real time form input validation
// socket related events are defined (e.g inpUsername) together with relevant actions (e.g validate.username)


var validate = require('validation');								// validation helpers

module.exports = function (socket) {
  
	socket.on('inpUsername', function (msg, id) {
		validate.username(msg, function(status, statustxt) {
			socket.emit('infoUsername', { color: status ? 'green' : 'red', txt: statustxt });
		}, id);
	});
	
	socket.on('inpEmail', function (msg, id) {
		validate.email(msg, function(status, statustxt) {
			socket.emit('infoEmail', { color: status ? 'green' : 'red', txt: statustxt });
		}, id);
	});
	
	socket.on('inpPassword', function (msg) {
		validate.password(msg, function(status, statustxt) {
			socket.emit('infoPassword', { color: status ? 'green' : 'red', txt: statustxt });
		});
	});
	
	socket.on('inpVerify', function (msg) {
		validate.verify(msg, function(status, statustxt) {
			socket.emit('infoVerify', { color: status ? 'green' : 'red', txt: statustxt });
		});
	});	
  
	socket.on('inpReset', function (msg) {
		validate.email2reset(msg, function(status, statustxt) {
			socket.emit('infoReset', { color: status ? 'green' : 'red', txt: statustxt });
		});
	});
	
	socket.on('inpCName', function (msg) {
		validate.cname(msg, function(status, statustxt) {
			socket.emit('infoCName', { color: status ? 'green' : 'red', txt: statustxt });
		});
	});
	
	socket.on('inpCEmail', function (msg) {
		validate.cemail(msg, function(status, statustxt) {
			socket.emit('infoCEmail', { color: status ? 'green' : 'red', txt: statustxt });
		});
	});
	
	socket.on('inpCText', function (msg) {
		validate.ctext(msg, function(status, statustxt) {
			socket.emit('infoCText', { color: status ? 'green' : 'red', txt: statustxt });
		});
	});
	
	socket.on('inpPEmail', function (msg, id) {
		validate.email(msg, function(status, statustxt) {
			socket.emit('infoEmail', { color: status ? 'green' : 'red', txt: statustxt });
		}, id);
	});

	socket.on('inpPEmail', function (msg, id) {
		validate.email(msg, function(status, statustxt) {
			socket.emit('infoEmail', { color: status ? 'green' : 'red', txt: statustxt });
		}, id);
	});
	
};


		

	
	
	
	
	