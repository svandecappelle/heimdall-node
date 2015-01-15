/*jslint node: true */
'use strict';

var async = require('async'),
	nconf = require('nconf'),
	logger = require('log4js').getLogger("Server:create"),
	utils = require('./../../../public/utils'),
	db = require('./../database'),
	groups = require('../groups'),
	emailer = require('./../emailer');

module.exports = function(Server) {
	Server.edit = function(serverData, callback) {
		var uid = serverData.host;
		var desc = serverData.desc;
		var port = serverData.port;
		var users = serverData.users;
		
		this.exists(uid, function(exists){
			if (!exists){
				logger.error("Server: " + uid + " doesn't exists :: " + exists);
				return callback("doesn't exists server");
			}

			db.setObject('server:' + uid, serverData, function(err) {
				if(err) {
					return callback(err);
				}

				async.parallel([
					function(next) {
						db.setAdd('servers', uid, next);
					},function(next){
						Server.setServerField(uid, 'desc', desc);
					},function(next){
						Server.setServerField(uid, 'port', port);
					},function(next){
						async.each(users,function(user){
							logger.debug( user.username);
							if (user.username && user.username!==""){
								db.listAppend('server:' + uid + ':users', user.username, function(err, list) {
									if(err){
										logger.error("Error appending list users: " + uid);
									}
								});
							}
						});
					},
					function(next){
						Server.replicateKeys(serverData.host, serverData.users, next);
					}
				], function(){
					callback();
				});

			});
		});
	};
};