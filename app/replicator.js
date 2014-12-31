var logger = require('log4js').getLogger('Replicator'),
	eventEmitter = require('events').EventEmitter,
	async = require("async"),
	meta = require("./meta"),
	db = require("./model/database"),
	fs = require("fs"),
	nconf = require("nconf"),
	Connection = require("ssh2"),
	async = require("async");

(function(Replicator) {


	Replicator.connect = function(options, callback){
		if (options.rsa){
			this.connectRsa(options.user, options.rsa, options.host, options.port, callback);
		}else if (options.rsaFile){
			this.connectRsaFile(options.user, options.rsaFile, options.host, options.port, callback);
		}else if(options.passwd){
			this.connectPasswd(options.user, options.passwd, options.host, options.port, callback);
		}else{
			this.connectRsaFile(options.user, nconf.get("replicator").rsaFile.replace("~", process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE), options.host, options.port, callback);
		}
	};

	Replicator.connectRsaFile = function(user, file, host, port, callback) {
		this.connectRsa(user, require('fs').readFileSync(file), host, port, callback);
	};

	Replicator.connectRsa = function(user, rsa, host, port, callback) {
		logger.debug('Connection :: rsa ');
		var conn = new Connection();
		conn.on('ready', function() {
			logger.debug('Connection :: ready');
			callback(conn);
		}).connect({
			host: host,
			port: port,
			username: user,
			privateKey: rsa
		});
	};

	Replicator.connectPasswd = function(user, passwd, host, port, callback){
		var conn = new Connection();
		conn.on('ready', function() {
			logger.debug('Connection :: ready');
			callback(conn);
		}).connect({
			host: host,
			port: port,
			username: user,
			password: passwd
		});
	};

	Replicator.replicate = function(key, options, callback) {
		var S = require('string');
		var remoteCommand = "echo {{key}} >> .ssh/authorized_keys";
		var values = {"key": key};
		var str = S(remoteCommand).template(values).s;

		logger.info("Exec remote command: " + str);

		this.connect(options, function(connection){
			connection.exec(str, function(err, stream) {
							if (err) throw err;
							stream.on('exit', function(code, signal) {
								callback(code, null);
							});
					});
		});
	};

	Replicator.status = function(){
		this.connect(options, function(connection){
			connection.exec('uptime', function(err, stream) {
							if (err) callback(null, err);
							stream.on('exit', function(code, signal) {
									logger.debug('Stream :: exit :: code: ' + code + ', signal: ' + signal);
							}).on('close', function() {
									logger.debug('Stream :: close');
									connection.end();
							}).on('data', function(data) {
									callback("Up");
									logger.debug('STDOUT: ' + data);
							}).stderr.on('data', function(data) {
									logger.error('STDERR: ' + data);
							});
					});
		});
	};

	Replicator.revoke = function(key, options, callback){
		var S = require('string');
		var newAuthorizedKeys = S("grep -v {{rsa_revoked}} ~/.ssh/authorized_keys > ~/.ssh/authorized_keys.tmp").template({"rsa_revoked": key}).s;
		var createABackupFile = "cat ~/.ssh/authorized_keys > ~/.ssh/authorized_keys.bak";
		var permissionFile = "chmod 0600 ~/.ssh/authorized_keys.tmp";
		var removeSSHConfig = "rm ~/.ssh/authorized_keys";
		var renewSSHConfig = "mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys";
		var deleteBackup = "rm ~/.ssh/authorized_keys.bak";
		logger.info("Remote command: " + newAuthorizedKeys);
		logger.info("Remote command: " + createABackupFile);
		logger.info("Remote command: " + permissionFile);
		logger.info("Remote command: " + removeSSHConfig);
		logger.info("Remote command: " + renewSSHConfig);
		logger.info("Remote command: " + deleteBackup);

		var replicator = this;

		replicator.connect(options, function(connection){
				async.series([
					function(next){
							replicator.exec(connection, newAuthorizedKeys, next);
					},
					function(next){
							replicator.exec(connection, createABackupFile, next);
					},
					function(next){
							replicator.exec(connection, permissionFile, next);
					},
					function(next){
							replicator.exec(connection, removeSSHConfig, next);
					},
					function(next){
							replicator.exec(connection, renewSSHConfig, next);
					},
					function(next){
							replicator.exec(connection, deleteBackup, next);
					}
				], callback);
		});
	};

	Replicator.exec = function(connection, command, callback){
		connection.exec(command, function(err, stream) {
			if (err) callback(err);
			stream.on('exit', function(code, signal) {
					callback();
			})
		});
	};

}(exports));
