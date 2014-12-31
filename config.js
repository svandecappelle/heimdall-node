var fs = require('fs'),
    os = require('os'),
    logger = require('log4js').getLogger('Config'),
    path = require('path'),
    pkg = require('./package.json'),
    nconf = require('nconf');


(function(Config) {

  Config.load = function () {
      nconf.argv().env();

      // Alternate configuration file support
      var configFile = __dirname + '/config.json',
          configExists;
      if (nconf.get('config')) {
          configFile = path.resolve(__dirname, nconf.get('config'));
      }
      configExists = fs.existsSync(configFile);

      nconf.file({
          file: configFile
      });

      nconf.defaults({
          base_dir: __dirname,
          upload_url: '/uploads/'
      });
  }
})(exports);
