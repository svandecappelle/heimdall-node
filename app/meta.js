/*jslint node: true */
"use strict";

var fs = require('fs'),
	//path = require('path'),
	//async = require('async'),
	logger = require('log4js').getLogger("meta"),
	//nconf = require('nconf'),
	//_ = require('underscore'),
	//rimraf = require('rimraf'),
	//mkdirp = require('mkdirp'),

	utils = require('./../public/utils'),
	//translator = require('./../public/translator'),
	db = require('./model/database'),
	plugins = require('./plugins'),
	user = require('./model/user');

(function (Meta) {
	Meta.restartRequired = false;
	Meta.config = {};

	Meta.configs = {
		init: function (callback) {
			delete Meta.config;

			Meta.configs.list(function (err, config) {
				if(err) {
					logger.error(err);
					return callback(err);
				}

				Meta.config = config;
				callback();
			});
		},
		list: function (callback) {
			db.getObject('config', function (err, config) {
				if(err) {
					return callback(err);
				}

				config = config || {};
				config.status = 'ok';
				callback(err, config);
			});
		},
		get: function (field, callback) {
			db.getObjectField('config', field, callback);
		},
		getFields: function (fields, callback) {
			db.getObjectFields('config', fields, callback);
		},
		set: function (field, value, callback) {
			if(!field) {
				return callback(new Error('invalid config field'));
			}

			db.setObjectField('config', field, value, function(err, res) {
				if (callback) {
					if(!err && Meta.config) {
						Meta.config[field] = value;
					}

					callback(err, res);
				}
			});
		},
		setOnEmpty: function (field, value, callback) {
			Meta.configs.get(field, function (err, curValue) {
				if(err) {
					return callback(err);
				}

				if (!curValue) {
					Meta.configs.set(field, value, callback);
				} else {
					callback();
				}
			});
		},
		remove: function (field) {
			db.deleteObjectField('config', field);
		}
	};

	Meta.title = {
		tests: {
			isCategory: /^category\/\d+\/?/,
			isTopic: /^topic\/\d+\/?/,
			isUserPage: /^user\/[^\/]+(\/[\w]+)?/
		},
		build: function (urlFragment, language, callback) {
			Meta.title.parseFragment(decodeURIComponent(urlFragment), language, function(err, title) {
				if (err) {
					title = Meta.config.browserTitle || 'NodeBB';
				} else {
					title = (title ? title + ' | ' : '') + (Meta.config.browserTitle || 'NodeBB');
				}

				callback(null, title);
			});
		},
		parseFragment: function (urlFragment, language, callback) {
			var	translated = ['', 'recent', 'unread', 'users', 'notifications'];
			if (translated.indexOf(urlFragment) !== -1) {
				if (!urlFragment.length) {
					urlFragment = 'home';
				}

				//translator.translate('[[pages:' + urlFragment + ']]', language, function(translated) {
					callback(null, translated);
				//});
			} else if (this.tests.isCategory.test(urlFragment)) {
				var cid = urlFragment.match(/category\/(\d+)/)[1];

				require('./categories').getCategoryField(cid, 'name', function (err, name) {
					callback(null, name);
				});
			} else if (this.tests.isTopic.test(urlFragment)) {
				var tid = urlFragment.match(/topic\/(\d+)/)[1];

				require('./topics').getTopicField(tid, 'title', function (err, title) {
					callback(null, title);
				});
			} else if (this.tests.isUserPage.test(urlFragment)) {
				var	matches = urlFragment.match(/user\/([^\/]+)\/?([\w]+)?/),
					userslug = matches[1],
					subpage = matches[2];

				user.getUsernameByUserslug(userslug, function(err, username) {
					if (subpage) {
						//translator.translate('[[pages:user.' + subpage + ', ' + username + ']]', language, function(translated) {
							callback(null, translated);
						//});
					} else {
						callback(null, username);
					}
				});
			} else {
				callback(null);
			}
		}
	};

	/* Settings */
	Meta.settings = {};
	Meta.settings.get = function(hash, callback) {
		hash = 'settings:' + hash;
		db.getObject(hash, function(err, settings) {
			if (err) {
				callback(err);
			} else {
				callback(null, settings || {});
			}
		});
	};

	Meta.settings.getOne = function(hash, field, callback) {
		hash = 'settings:' + hash;
		db.getObjectField(hash, field, callback);
	};

	Meta.settings.set = function(hash, values, callback) {
		hash = 'settings:' + hash;
		plugins.fireHook('action:settings.set', hash, values);
		db.setObject(hash, values, callback);
	};

	Meta.settings.setOne = function(hash, field, value, callback) {
		hash = 'settings:' + hash;
		db.setObjectField(hash, field, value, callback);
	};

	Meta.settings.setOnEmpty = function (hash, field, value, callback) {
		Meta.settings.getOne(hash, field, function (err, curValue) {
			if (err) {
				return callback(err);
			}

			if (!curValue) {
				Meta.settings.setOne(hash, field, value, callback);
			} else {
				callback();
			}
		});
	};
}(exports));