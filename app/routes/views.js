module.exports = function (app, options) {

	var authRoutes = require('./authentication'),
		middleware = require("../middleware/middleware"),
		user = require("../model/user"),
		servers = require("../model/servers"),
		async = require("async");
	
	authRoutes.createRoutes(app);

	app.get('/', function (req, res) {
      middleware.render('index', req, res);
    });

    app.get('/api/index', function (req, res) {

		async.parallel({
			users_count: function(callback){
				user.count(function(err, user_count){
					callback(null, user_count);
				});
			},

			keys_count: function(callback){
				user.Keys.count(function(err, keys_count){
					callback(null, keys_count);
				});
			},

			server_count: function(callback){
				servers.count(function (err, server_count){
					callback(null, server_count);
				});
			},

			pendingRequests: function(callback){
				servers.getPendingPermissionCounts(function (err, pending_requests_count){
					callback(null, pending_requests_count);
				});
			},

			totalRequests: function(callback){
				servers.getAllPermissionCounts(function (err, total_request_count){
					callback(null, total_request_count);
				});
			}

		}, function(err, result){
			res.json(result);
		});
    });

    app.get('/403', function(req, res){
		middleware.render('403', req, res);
    });
};