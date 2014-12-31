var logger = require('log4js').getLogger('Installer')

logger.info("Installing");

require("./config").load();

var user = require("./app/model/user");

user.create({email: "admin@heimdall.fr", username: "admin", password: "admin"}, function(err, uuid){
  if(err){
    logger.error("Error while create user: " + err);
    process.exit(code=1)
  }else{
    logger.info("Success create user: " + uuid);
    user.getUsers(["admin@heimdall.fr"], function (err, data){
      logger.info("Installed");
      process.exit(code=0);
    });
  }
});
