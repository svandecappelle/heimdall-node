/*jslint node: true */
"use strict";

var	fs = require('fs'),
	async = require('async'),
	path = require('path'),
	logger = require('log4js').getLogger('emailer'),

	User = require('./user'),
	app = {},
	Emailer = {};


Emailer.registerApp = function(expressApp) {
	app = expressApp;
	return Emailer;
};

Emailer.send = function(template, uid, params) {
	logger.warn("Emailer.send() :: TODO Implement it.");
};

module.exports = Emailer;