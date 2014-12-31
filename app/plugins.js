var logger = require('log4js').getLogger('Plugins'),
	eventEmitter = require('events').EventEmitter,
	async = require("async"),
	meta = require("./meta"),
	db = require("./model/database"),
	fs = require("fs");

(function(Plugins) {

	Plugins.libraries = {};
	Plugins.loadedHooks = {};
	
	Plugins.initialized = false;

	// Events
	Plugins.readyEvent = new eventEmitter;

	Plugins.init = function() {
		if (Plugins.initialized) {
			return;
		}

		if (global.env === 'development') {
			logger.info('[plugins] Initializing plugins system');
		}

		Plugins.reload(function(err) {
			if (err) {
				if (global.env === 'development') {
					logger.info('[plugins] NodeBB encountered a problem while loading plugins', err.message);
				}
				return;
			}

			if (global.env === 'development') {
				logger.info('[plugins] Plugins OK');
			}
			Plugins.initialized = true;
			Plugins.readyEvent.emit('ready');
		});
	};

	Plugins.reload = function(callback) {
		// Resetting all local plugin data
		Plugins.loadedHooks = {};

		// Read the list of activated plugins and require their libraries
		async.waterfall([
			function(next) {
				db.getSetMembers('plugins:active', next);
			},
			function(plugins, next) {
				if (!plugins || !Array.isArray(plugins)) {
					next();
				}

				plugins.push(meta.config['theme:id']);

				plugins = plugins.filter(function(plugin){
					return plugin && typeof plugin === 'string';
				}).map(function(plugin){
					return path.join(__dirname, '../node_modules/', plugin);
				});

				async.filter(plugins, fs.exists, function(plugins){
					async.each(plugins, Plugins.loadPlugin, next);
				});
			},
			function(next) {
				if (global.env === 'development') logger.info('[plugins] Sorting hooks to fire in priority sequence');
				Object.keys(Plugins.loadedHooks).forEach(function(hook) {
					var hooks = Plugins.loadedHooks[hook];
					hooks = hooks.sort(function(a, b) {
						return a.priority - b.priority;
					});
				});

				next();
			}
		], callback);
	};

	Plugins.registerHook = function(id, data, callback) {
		/*
		`data` is an object consisting of (* is required):
		`data.hook`*, the name of the NodeBB hook
		`data.method`*, the method called in that plugin
		`data.callbacked`, whether or not the hook expects a callback (true), or a return (false). Only used for filters. (Default: false)
		`data.priority`, the relative priority of the method when it is eventually called (default: 10)
		*/

		var method;

		if (data.hook && data.method && typeof data.method === 'string' && data.method.length > 0) {
			data.id = id;
			if (!data.priority) data.priority = 10;
			method = data.method.split('.').reduce(function(memo, prop) {
				if (memo !== null && memo[prop]) {
					return memo[prop];
				} else {
					// Couldn't find method by path, aborting
					return null;
				}
			}, Plugins.libraries[data.id]);

			if (method === null) {
				winston.warn('[plugins/' + id + '] Hook method mismatch: ' + data.hook + ' => ' + data.method);
				return callback();
			}

			// Write the actual method reference to the hookObj
			data.method = method;

			Plugins.loadedHooks[data.hook] = Plugins.loadedHooks[data.hook] || [];
			Plugins.loadedHooks[data.hook].push(data);

			callback();
		} 
		else return;
	};



	Plugins.fireHook = function(hook) {
		logger.warn("Need to fire a hook plugin: " + hook);


		var callback = typeof arguments[arguments.length-1] === "function" ? arguments[arguments.length-1] : null,
			args = arguments.length ? Array.prototype.slice.call(arguments, 1) : [];

		if (callback) {
			args.pop();
		}

		hookList = Plugins.loadedHooks[hook];

		if (hookList && Array.isArray(hookList)) {
			// if (global.env === 'development') logger.info('[plugins] Firing hook: \'' + hook + '\'');
			var hookType = hook.split(':')[0];
			switch (hookType) {
				case 'filter':
					async.reduce(hookList, args, function(value, hookObj, next) {
						if (hookObj.method) {
							if (!hookObj.hasOwnProperty('callbacked') || hookObj.callbacked === true) {
								var	value = hookObj.method.apply(Plugins, value.concat(function() {
									next(arguments[0], Array.prototype.slice.call(arguments, 1));
								}));

								if (value !== undefined && value !== callback) {
									logger.warn('[plugins/' + hookObj.id + '] "callbacked" deprecated as of 0.4x. Use asynchronous method instead for hook: ' + hook);
									next(null, [value]);
								}
							} else {
								logger.warn('[plugins/' + hookObj.id + '] "callbacked" deprecated as of 0.4x. Use asynchronous method instead for hook: ' + hook);
								value = hookObj.method.apply(Plugins, value);
								next(null, [value]);
							}
						} else {
							if (global.env === 'development') {
								logger.info('[plugins] Expected method for hook \'' + hook + '\' in plugin \'' + hookObj.id + '\' not found, skipping.');
							}
							next(null, [value]);
						}
					}, function(err, values) {
						if (err) {
							if (global.env === 'development') {
								logger.info('[plugins] Problem executing hook: ' + hook);
							}
						}

						callback.apply(Plugins, [err].concat(values));
					});
					break;
				case 'action':
					async.each(hookList, function(hookObj) {
						if (hookObj.method) {
							hookObj.method.apply(Plugins, args);
						} else {
							if (global.env === 'development') {
								logger.info('[plugins] Expected method \'' + hookObj.method + '\' in plugin \'' + hookObj.id + '\' not found, skipping.');
							}
						}
					});
					break;
				default:
					// Do nothing...
					break;
			}
		} else {
			// Otherwise, this hook contains no methods
			if (callback) {
				callback.apply(this, [null].concat(args));
			}

			return args[0];
		}

	};

	Plugins.ready = function(callback) {
		if (!Plugins.initialized) {
			Plugins.readyEvent.once('ready', callback);
		} else {
			callback();
		}
	};
}(exports));