/*jslint node: true */
'use strict';

var bcrypt = require('bcryptjs'),
	async = require('async'),
	nconf = require('nconf'),
	logger = require('log4js').getLogger('notifications'),
	gravatar = require('gravatar'),
	S = require('string'),

	utils = require('./../../public/utils'),
	db = require('./database'),
	groups = require('./groups'),
	notifications = require('./notifications');

(function(Notifications) {
	Notifications.create = function(){

	};
}(exports));