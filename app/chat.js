(function (Chat) {
	var users = {};
	var statuses = {};
	var moment = require('moment'),
		_ = require("underscore");
	var io;
	Chat.start = function(server){
		io = require('socket.io').listen(server);

		io.sockets.on('connection', function (socket) {

			socket.emit('authenticate');

			console.log("socket need authenticate: " + socket);
			//console.log(users);
			socket.on('checkin', function (incoming) {
				console.log(incoming.user + " connected on chat");
				//console.log(incoming);
				//console.log("Connection to chat: " + incoming);
				users[incoming.user] = socket;
				statuses[incoming.user] = "online";
				io.sockets.emit('statuschange', statuses);
			});
			socket.on('statuschange', function(incoming){
				socket.reconnectionDelay /= 1;
				statuses[incoming.user] = incoming.status;
				io.sockets.emit('statuschange', statuses);
			});

			socket.on('msg', function (data) {
				//console.log(users);
				console.log(data);
				try{
					if (data.to !== undefined && data.to !== "all" && data.to !== "administrators"){
						
						var socketid = users[data.to];
						data.date = moment().format("YYYY-MM-DD HH:mm:ss");
						//console.log("send to " + socketid);
						if (socketid !== undefined){
							datato = _.clone(data);
							datato.format = '{"color":"green"}';
							var recipicentFromTo = {
								from: data.from,
								to: data.from
							};

							datato.from = recipicentFromTo.from;
							datato.to = recipicentFromTo.to;
							users[data.from].emit('new', data);
							socketid.emit('new', datato);
						}else{
							users[data.from].emit('new', data);
							users[data.from].emit('new', {
								from: "System",
								to: data.to,
								msg: 'User is not connected', 
								date: moment().format("YYYY-MM-DD HH:mm:ss"),
								format: '{"color":"grey"}'
							});					
						}

					}else if(data.to === "all"){
						io.sockets.emit('new', data);
					}else if(data.to === "administrators"){
						//io.sockets.emit('new', data);
					}else {
						io.sockets.emit('new', data);
					}
				}catch(err){
					console.log(err);
				}
				
			});
		});
	};

	Chat.authenticatedUsers = function(){
		console.log(_.clone(statuses));
		return _.pairs(_.clone(statuses));
	};

	Chat.disconnect = function(user){
		users[user.username] = undefined;
		statuses[user.username] = 'offline';
		io.sockets.emit('statuschange', statuses);
	};
}(exports));

