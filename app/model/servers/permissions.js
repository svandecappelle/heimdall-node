/*jslint node: true */
'use strict';

var async = require('async'),
	nconf = require('nconf'),
	logger = require('log4js').getLogger("Server:permissions"),
	utils = require('./../../../public/utils'),
	db = require('./../database'),
	groups = require('../groups'),
	emailer = require('./../emailer'),
	_ = require("underscore"),
	moment = require('moment');

module.exports = function(Server) {

	Server.listAllPermissions = function(options, callback){
		Server.getAllServers(function(err, servers){
			if(err){
				callback(err);
			}
			async.map(servers, function(server, next){

				Server.listPermissions({host: server.host}, options, function(err, permisssionsHost){
					if (permisssionsHost.length > 0){
						next(err, permisssionsHost);
					}else{
						next(err, false);
					}
				});
			},function(err, permissions){
				
				// Array is [Host1Permsissions[], Host2Permissions, ...].
				var permissionsFlat = [];
				var permissionsFlatFlat = [];
				_.each(permissions, function(permissionHostGroup){
					permissionsFlatFlat = _.union(permissionsFlatFlat, _.compact(permissionHostGroup));

					_.each(permissionsFlatFlat, function(permissionHostGroup){
						permissionsFlat = _.union(permissionsFlat, _.compact(permissionHostGroup));
					});
				});
				

				callback(null, permissionsFlat);
			});
		});
	};

	Server.listPermissions = function(requestData, options, callback) {
		logger.debug("listPermissions: " + requestData.host);
		this.exists(requestData.host, function(exists){
			if (!exists){
				logger.error("Server: " + requestData.host + " does not exists :: " + exists);
				return callback("Doesn't exists server");
			}

			db.getSetMembers('server:' + requestData.host + ':permissions-request', function (err, uids) {
				if (err) {
					logger.error(err);
					return callback(err);
				}
				
				if (options.expand) {
					async.map(uids, function (uids, next){
						Server.getPermissionData(uids, options, next);
					}, callback);
				} else {
					callback(err, uids);
				}
			});
		});
	};

	Server.createPermissionRequest = function(requestData, callback){
		Server.getPermissionNextId(function(err, id){
			requestData.id = id;

			Server.exists(requestData.host, function(exists){
				if (!exists){
					logger.error("Server: " + requestData.host + " does not exists :: " + exists);
					return callback("Doesn't exists server");
				}

				var request = {
					id: requestData.id,
					user: requestData.user,
					usertarget: requestData.usertarget,
					hostname: requestData.host
				};

				var createMessageSystem = {
					date: moment().format("YYYY-MM-DD HH:mm:ss"),
					timestamp: moment().format("X"),
					message: "Creation",
					from: "System"
				};

				if (requestData.comment){
					var createMessageUser = {
						date: moment().format("YYYY-MM-DD HH:mm:ss"),
						timestamp: parseInt(moment().format("X")) + 1,
						message: requestData.comment,
						from: requestData.commentFrom
					};
				}

				db.setObject('server:permissions-request:' + request.id, request, function(){
					db.setAdd('server:' + requestData.host + ':permissions-request', request.id, function(){
						
						async.parallel(
							[
							function(callback){
								db.setObject('server:permissions-request:' + request.id + ':comments:' + createMessageSystem.timestamp, createMessageSystem, function(){
									db.setAdd('server:permissions-request:' + request.id + ':comments', createMessageSystem.timestamp, function(){
										callback(null, 'System');
									});
								});
							}, function(callback){
								if(createMessageUser){
									db.setObject('server:permissions-request:' + request.id + ':comments:' + createMessageUser.timestamp, createMessageUser, function(){
										db.setAdd('server:permissions-request:' + request.id + ':comments', createMessageUser.timestamp, function(){
											callback(null, 'User');
										});
									});
								}else{
									callback(null, 'User');
								}
							}, function(callback){
								db.incrObjectField('global', 'pendingRequest');
								db.incrObjectField('global', 'totalRequest');
								callback(null, 'GlobalConstants');
							}], callback);
					});
				});
			});
		});
	};

	Server.editPermissionRequest = function(requestData, callback){
		Server.exists(requestData.host, function(exists){
			// Set values

			var request = {
				id: requestData.id,
				user: requestData.user,
				usertarget: requestData.usertarget,
				hostname: requestData.host
			};

			var createMessageSystem = {
				date: moment().format("YYYY-MM-DD HH:mm:ss"),
				timestamp: moment().format("X"),
				message: requestData.comment,
				from: requestData.commentFrom
			};

			db.setObject('server:permissions-request:' + request.id, request, function(){
				db.setAdd('server:' + requestData.host + ':permissions-request', request.id, function(){
					db.setObject('server:permissions-request:' + request.id + ':comments:' + createMessageSystem.timestamp, createMessageSystem, function(){
						db.setAdd('server:permissions-request:' + request.id + ':comments', createMessageSystem.timestamp, function(){
							callback(null);
						});
					});
				});
			});
		});
	};

	Server.getPermissionData = function(uids, options, callback){
		var keys = _.map(uids, function(uid) {
			return 'server:permissions-request:' + uid;
		});

		db.getObjects(keys, function(err, permissions) {
			if (err) {
				return callback(err);
			}

			// filter
			var filtererPermissions = [];
			if (options.filter && options.filter.user){
				_.forEach(permissions, function(permission){
					if (permission.user !== options.filter.user){
						filtererPermissions.push(permission);
					}
				});
			}

			permissions = _.difference(permissions, filtererPermissions);

			logger.debug(permissions);

			async.map(permissions, function(permission, nextPermission){
				if(permission !== null){
					var commentKey = 'server:permissions-request:' + permission.id + ':comments';

					db.getSetMembers(commentKey, function(err, permissionsComments) {
						if (err) {
							return callback(err);
						}
						permission.comments=[];

						var lastUpdateTimeStamp = 0;
						// permissionsComments = _.sort(permissionsComments);
						logger.debug(permissionsComments);


						async.map(permissionsComments, function(commentTimeStamp, next){
							var commentDetailKey = commentKey + ':' + commentTimeStamp;

							db.getObject(commentDetailKey, function(err, permissionComment) {
								
								// Comment datas
								var comment = {timestamp: commentTimeStamp};
								comment.message = permissionComment.message;
								comment.date = permissionComment.date;
								comment.from = permissionComment.from;
								
								if (lastUpdateTimeStamp < comment.timestamp){
									permission.lastupdate = permissionComment.date;
								}
								logger.warn("push comment to comments objects  " + comment.message);
								
								// Callback comment
								//permission.comments.push(comment);
								next(err, comment);

							});
						}, function(err, permissionsComments){

							permission.comments = permissionsComments;
							logger.info(permissionsComments);
							//_.union(permission.comments, permissionsComments);
							// Callback permission
							nextPermission(err, permission);			
						});

					});
				}else{
					nextPermission(null, null);
				}
			}, function(err, permissions){
				logger.info("permissions callback");
				logger.info(permissions);
				callback(null, permissions);						
			});
		});
	};

	Server.getPermissionNextId = function(callback){
		db.getObjectField('global', 'totalRequest', callback);
	};

	Server.getPendingPermissionCounts = function(callback){
		db.getObjectField('global', 'pendingRequest', callback);
	};

	Server.getAllPermissionCounts = function(callback){
		db.getObjectField('global', 'totalRequest', callback);
	};
};