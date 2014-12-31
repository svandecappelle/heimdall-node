/*jslint node: true */
'use strict';

var async = require('async'),
	nconf = require('nconf'),
	logger = require('log4js').getLogger('Server'),
	plugins = require('../plugins'),
	utils = require('./../../public/utils'),
	db = require('./database'),
	groups = require('./groups'),
	notifications = require('./notifications');

(function(Server) {

	require('./servers/create')(Server);
	require('./servers/edit')(Server);
	require('./servers/permissions')(Server);

	Server.count = function(callback){
		db.getObjectField('global', 'serverCount', callback);
	};

	Server.getServerField = function(uid, field, callback) {
		db.getObjectField('server:' + uid, field, callback);
	};

	Server.getServerFields = function(uid, fields, callback) {
		db.getObjectFields('server:' + uid, fields, callback);
	};

	Server.getMultipleServerFields = function(uids, fields, callback) {

		if (!Array.isArray(uids) || !uids.length) {
			return callback(null, []);
		}

		var keys = uids.map(function(uid) {
			return 'server:' + uid;
		});

		db.getObjectsFields(keys, fields, callback);
	};

	Server.getServerData = function(uid, callback) {
		Server.getServersData([uid], function(err, servers) {
			callback(err, servers ? servers[0] : null);
		});
	};

	Server.getServersData = function(uids, callback) {

		if (!Array.isArray(uids) || !uids.length) {
			return callback(null, []);
		}

		var keys = uids.map(function(uid) {
			return 'server:' + uid;
		});
			db.getObjects(keys, function(err, servers) {
			if (err) {
				return callback(err);
			}
			async.each(servers,function(server, next){
				db.getList('server:' + server.host + ':users',  function(err, usersConfigured) {
					server.users = usersConfigured;
					logger.debug(usersConfigured);
					logger.warn(server.users);
					next();
				});
			}, function(err){
				callback(null, servers);
			});
			
			
			
		});
		
	};

	Server.setServerField = function(uid, field, value, callback) {
		plugins.fireHook('action:server.set', field, value, 'set');
		db.setObjectField('server:' + uid, field, value, callback);
	};

	Server.setServerFields = function(uid, data, callback) {
		for (var field in data) {
			if (data.hasOwnProperty(field)) {
				plugins.fireHook('action:server.set', field, data[field], 'set');
			}
		}

		db.setObject('server:' + uid, data, callback);
	};

	Server.getAllServers = function(callback) {
		this.search("", callback);
	};

	Server.search = function(query, callback) {
		db.getSetMembers('servers', function(err, servers) {
			servers = servers.filter(function(serverName) {
				return serverName.match(new RegExp(utils.escapeRegexChars(query), 'i'));
			});

			Server.getServersData(servers, callback);
		});
	};


	Server.getServers = function(uids, callback) {
		Server.getMultipleServerFields(uids, ['host', 'servername', 'status'], function(err, serversData) {
			if (err) {
				return callback(err);
			}
			async.map(serversData, /*loadUserInfo,*/ callback);
		});
	};

	Server.exists = function(servername, callback) {
		db.isSetMember('servers', servername, function(err, exists){
			callback(exists);
		});
	};

}(exports));
