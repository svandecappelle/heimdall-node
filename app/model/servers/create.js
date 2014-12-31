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
					}
				], callback);

			});
		});
	};
};
