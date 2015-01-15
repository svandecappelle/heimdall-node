/*jslint node: true */
'use strict';

var async = require('async'),
	nconf = require('nconf'),
	logger = require('log4js').getLogger("Server:create"),
	utils = require('./../../../public/utils'),
	db = require('./../database'),
	groups = require('../groups'),
	emailer = require('./../emailer'),
	replicator = require("../../replicator"),
	_ = require("underscore");

module.exports = function(Server) {

	Server.replicateKeys = function (host, users, callback) {
		if (users){
			_.each(users, function(hostParams){
				logger.info("Replicate Heimdall keys on server: ".concat(host).concat(" for user ").concat(hostParams.username));
				replicator.replicateHeimdall({user: hostParams.username, host: host, passwd: hostParams.password});
			});
			callback();
		}else{
			logger.warn("No user configured after server registeration.");
		}
	};

	Server.create = function(serverData, callback) {
		var uid = serverData.host;
		var desc = serverData.desc;
		var port = serverData.port;

		this.exists(uid, function(exists){
			if (exists){
				logger.error("Server: " + uid + " already exists :: " + exists);
				return callback("already exists server");
			}

			db.setObject('server:' + uid, serverData, function(err) {
				if(err) {
					return callback(err);
				}

				async.parallel([
					function(next) {
						db.setAdd('servers', uid, next);
					},
					function(next) {
						db.incrObjectField('global', 'serverCount');
						next();
					},
					function(next){
						Server.setServerField(uid, 'desc', desc);
						next();
					},
					function(next){
						Server.setServerField(uid, 'port', port);
						next();
					},
					function(next){
						Server.replicateKeys(serverData.host, serverData.users, next);
					}
				], callback);

			});
		});
	};
};
