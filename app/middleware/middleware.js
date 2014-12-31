/*jslint node: true */
"use strict";

var middleware = {},
	async = require('async'),
	gravatar = require("gravatar"),
	translator = require("./translator/translator").init('fr'),
	_ = require("underscore"),
	nconf = require('nconf'),
	chat = require('../chat'),
	fs = require('fs'),
	logger = require('log4js').getLogger("Middleware"),
	S = require("string");

var identicon = null;
try {
	identicon = require('identicon');
}catch(expect){
	logger.warn("Not compatible optional extension: identicon.");
}
/*
	Render a view. Control if rights are valid to access the view and if user is authenticated (if needed).
 */
middleware.render = function(view, req, res, objs){
	
	if (this.requireAuthentication(view, req)){
		// need an auth
		req.session.redirectTo = req.originalUrl;
		res.send(req.session);
		return this.redirect('/login', res);
	}else if(this.requireMorePrivilege(req, res, view) && view !== '403'){
		// need more privilege
		return this.redirect('/403', res);
	}else{
		var viewParams = objs;
		if (viewParams === undefined){
			viewParams = {};
		}
		var middlewareObject = {
			req: req,
			res: res,
			view: view,
			objs: viewParams
		};

		var call = async.compose(this.session, this.meta, this.translate);

		call(middlewareObject, function(err, middlewareObject){
			logger.debug(middlewareObject.objs);
			res.render(view, middlewareObject.objs);
		});
		
	}
};

/*
	Translate view
 */
middleware.translate = function(middlewareObject, next){
	// Add I18n values
	var translateView = translator.instance(middlewareObject.view);
	_.extend(middlewareObject.objs, translateView.get());
	next(null, middlewareObject);
};

/*
	Add session objs in view params
 */
middleware.session = function(middlewareObject, next){

	logger.warn(middlewareObject.objs);

	var urlUser = '/img/anonymous.jpg';
	var urlServer = null;
	
	if (middlewareObject.req.headers.host.lastIndexOf(":" + nconf.get("port")) != -1){
		urlServer = middlewareObject.req.headers.host.substring(0, middlewareObject.req.headers.host.length - (nconf.get("port").length + 1));
	}else{
		urlServer = middlewareObject.req.headers.host;
	}

	var serverConfig = {
		serverurl: urlServer,
		serverport: nconf.get("port")
	};

	// that's ok
	if (middlewareObject.objs === undefined){
		middlewareObject.objs = {
			session: {}
		};
	}else if(middlewareObject.objs.session === undefined){
		middlewareObject.objs.session = {};
	}

	_.extend(middlewareObject.objs, serverConfig);
	middlewareObject.objs.connected_users = chat.authenticatedUsers();
	middlewareObject.objs.session.user = {
		isAnonymous: true,
	};
	
	if (middlewareObject.req.session.chats === undefined){
		middlewareObject.req.session.chats = [];
	}
	middlewareObject.objs.session.chats = middlewareObject.req.session.chats;

	middlewareObject.objs.session.notifications = {
		count: 2,
		datas: ["test", "test2"]
	};
	

	if (middlewareObject.req.isAuthenticated()){
		urlUser = gravatar.url(middlewareObject.req.user.uid, {s: '200', r: 'pg', d: '404'});
		// generate a url through identicon if none found on gravatar
		if (urlUser.lastIndexOf("404")!=-1){
			var avatarPathFile = __dirname + "/../../public" + nconf.get("upload_path") + '/users/icons/' + middlewareObject.req.user.username + '.png';
			if(!fs.existsSync(avatarPathFile)){
				if (identicon){
					identicon.generate(middlewareObject.req.user.uid, 150, function(err, buffer) {
						if (err) throw err;
						fs.writeFileSync(avatarPathFile, buffer);
					});
				}
			}
			urlUser = nconf.get("upload_path") + '/users/icons/' + middlewareObject.req.user.username + '.png';
		}
		middlewareObject.objs.session.user = middlewareObject.req.user;
		middlewareObject.objs.session.user.isAnonymous = false;

		// Retrieve role type
		middleware.isManager(middlewareObject.req.session.passport.user.uid, function(err, isManager){
			logger.debug("User is a manager: "+isManager);
			if(isManager){
				middlewareObject.objs.session.user.role = "MANAGER";
			}else{
				middlewareObject.objs.session.user.role = "USER";
			}

			middlewareObject.objs.session.gravatar = urlUser;
			logger.debug("return middleware: " + middlewareObject.objs);
			next(null, middlewareObject);
		});
	}else{
		logger.debug("return middleware: " + middlewareObject);
		next(null, middlewareObject);
	}
	

};

/*
	Add meta config of user in view params
 */
middleware.meta = function(middlewareObject, next){
	middlewareObject.objs.meta = {
		nav: {
			separated: false
		}
	};
	next(null, middlewareObject);
};


/*
	Post a method (test if user is authenticated)
 */
middleware.post = function(req, res, callback){
	if (!req.isAuthenticated()){
		res.send('403', 'You need to be logged');
	}else{
		callback();
	}
};

/*
	Get a response (test if user is authenticated)
 */
middleware.get = function(req, res, callback){
	if (!req.isAuthenticated()){
		req.session.redirectTo = req.originalUrl;
		res.send(req.session);
		this.redirect('/login', res);
	}else{
		callback();
	}
};

/*
	Send redirect to client.
 */
middleware.redirect = function(view, res){
	res.redirect(view);
};

/*
	Test if more privilege is required.
 */
middleware.requireMorePrivilege = function(req, res, view){
	var user = require('./permissions/user.json');
	

	logger.debug("view user:: " + S(view).startsWith("user"));
	if (S(view).startsWith("user")){
		logger.debug("view user");
		if(user.get.lastIndexOf(view) === -1){
			logger.warn(req.session.passport.user);
			// require more privilege than simple connected user
			// need to check if manager or admin
			//	if ()
			//return true;
			this.isManager(req.session.passport.user.uid, function(isManager){
				return isManager;
			});

		}
	}
	var json = require('./permissions/manager.json');

	//return false;
};

/*
	Test id user is a manager
 */
middleware.isManager = function(uid, callback){
	var userModel = require('../model/user');
	var groupsModel = require('../model/groups');

	groupsModel.getAllGroups(function(err, groups){
		var hasManagerRole = false;
		async.each(groups, function(group, next){
			userModel.isManager(uid, group, function(err, isManager){
				logger.debug(isManager);
				if (err){
					next(err);
				}
				if (isManager){
					hasManagerRole = true;
				}
				return next();
			});
		}, function(err){
			logger.debug("callback: "+hasManagerRole);
			callback(err, hasManagerRole);
		});
	});
};

/*
	Test id user need to be authentified
 */
middleware.requireAuthentication = function (view, req) {

	var unauthenticatedPermissions = require("./permissions/all.json");
	var authenticationRequired = unauthenticatedPermissions.get.lastIndexOf(view) !== -1;

	if (!authenticationRequired){
		return !req.isAuthenticated();
	}else{
		return false;
	}

};

/*
	Render internal error.
 */
middleware.error = function(req, res, error){
	logger.error("Redirect on error view: " + error);
	middleware.render("500", req, res, {error: {message: error}});
};

module.exports = middleware;