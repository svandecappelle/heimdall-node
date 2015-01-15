module.exports = function (app, options) {
    var users = require("../../model/user"),
        groups = require("../../model/groups"),
        middleware = require("../../middleware/middleware"),
        logger = require("log4js").getLogger("AdminRoute"),
        generatePassword = require('password-generator'),
        mail = require("nodemailer").mail,
        async = require("async"),
        utils = require('./../../../public/utils'),
        servers = require('../../model/servers');


    var addUsersToGroup = function(data, callback){
      async.parallel([
        function(nextMemberType){
          if(data.managers){
            async.each(data.managers, function(item, next){
              var userslug = utils.slugify(item.username);
              users.getUidByUsername(userslug, function(err, uid) {
                if (err) {
                  return logger.error(err);
                }
                groups.addManager(data.group, uid, function(){
                  if (!err){
                    next();
                  }
                });
              });
            },function(){
              nextMemberType();
            });
          }
        },
        function(finish){
          if(data.members){
            async.each(data.members, function(item, next){
              var userslug = utils.slugify(item.username);
              users.getUidByUsername(userslug, function(err, uid) {
                if (err) {
                  return logger.error(err);
                }
                groups.join(data.group, uid, function(){
                  if (!err){
                    next();
                  }
                });
              });
            },function(){
              finish();
            });
          }
        }
      ], function(){
        callback();
      });
    };



    app.get('/admin/users', function (req, res) {
      middleware.render('admin/users/all', req, res);
    });

    app.get('/api/admin/users', function (req, res) {
      // for test ajax
      setTimeout(function (){

        allusers = users.getAllUsers(function(err, out){
          res.json({users: out.users});
        });
      }, 100);
    });

    app.get('/admin/user/create', function (req, res) {
      middleware.render('admin/users/create', req, res);
    });

    app.get('/admin/users/edit/:user', function (req, res) {
      users.getUserDataByUsername(req.params.user, function(err, userData){
        if(err || userData === null){
          middleware.render('500', {error : {message : err}});
        }else{
          middleware.render('admin/users/edit', req, res, {user : userData});
        }
      });
    });

    app.post('/admin/user/create', function (req, res) {
      middleware.post(req, res, function(){
        logger.info("create a user with: " + req.body.data.username);
        var userData = req.body.data;
        userData.password = generatePassword(12, false);
        users.create(userData, function(err, uuid){
          if (err){
            logger.warn("User cannot be created: " + err);
          }else{
            mail({
              from: "Heimdall<svandecappelle@vekia.fr>", // sender address
              to: userData.email, // list of receivers
              subject: "Registeration to heimdall", // Subject line
              text: "Welcome to heimdall " + userData.username + ". Your account is now created and you can access to application with the following generated password: " + userData.password, // plaintext body
              html: "<h1>Welcome to heimdall " + userData.username + "</h1> <p>Your account is now created and you can access to application with the following generated password: " + userData.password + "</p>"// html body
            });
          }
        });
      });
    });

    app.get('/admin/groups', function (req, res) {
        middleware.render('admin/groups/all', req, res);
    });

    app.post('/admin/groups/create', function (req, res) {
        logger.info("create a group");
        var groupName = req.body.data.group;
        var desc = req.body.data.description;
        logger.warn(req.body.data);
        groups.create(groupName, desc, function(err){
          if (!err){
            addUsersToGroup(req.body.data, function(){
              middleware.redirect('/admin/groups', res);
            });
          }else{
            //trigger an exception to client
          }
        });
    });

    app.post('/admin/groups/edit/:group', function (req, res) {
        logger.info("edit a group");
        addUsersToGroup(req.body.data, function(){
              middleware.redirect('/admin/groups', res);
        });
    });


    app.get('/api/admin/group/:group', function (req, res) {
      groups.get(req.params.group, {expand: true}, function(err, group){
        res.json({group: group});
      });
    });

    app.get('/admin/groups/edit/:group', function (req, res) {
      middleware.render('admin/groups/edit', req, res, {groupname: req.params.group});
    });

    app.get('/admin/groups/create', function (req, res) {
      middleware.render('admin/groups/create', req, res);
    });

    app.get('/api/admin/groups', function (req, res) {
      allgroups = groups.getAllGroups(function(err, out){
        res.json({groups: out});
      });
    });

    app.get('/admin/groups/remove/:group', function (req, res) {
      middleware.get(req, res, function(){
        // delete a group
        logger.info("Delete group: " + req.params.group);
      });
    });

    app.get('/admin/managegroup/member/:user/:group/remove', function (req, res) {
      middleware.get(req, res, function(){
        // remove a user from group
        logger.debug(req.params);
        logger.info("remove " + req.params.user + " from group: " + req.params.group);

        users.getUidByUsername(req.params.user, function(err, uid) {
          if (err) {
            middleware.error(req, res, err);
          }
          groups.leave(req.params.group, uid, function(err){
            if (!err){
              middleware.redirect('/admin/groups/edit/'+ req.params.group, res);
            }else{
              middleware.error(req, res, err);
            }
          });
        });
      });
    });

    app.get('/admin/managegroup/manager/:user/:group/remove', function (req, res) {
        // remove a user from group
        logger.info("remove " + req.params.user + " from manager of group: " + req.params.group);
        users.getUidByUsername(req.params.user, function(err, uid) {
          if (err) {
            return logger.error(err);
          }
          groups.leaveAsManager(req.params.group, uid, function(){
            if (!err){
              middleware.redirect('/admin/groups/edit/'+ req.params.group, res);
            }
          });
        });
    });

    app.get('/api/admin/:user/groups', function (req, res) {
      users.getGroupsByUsername(req.params.user, function(out){
        res.json({groups: out});
      });
    });

    // Servers
    app.get('/admin/servers/create', function (req, res) {
      middleware.render('admin/servers/create', req, res);
    });

    app.get('/admin/servers/edit/:server', function (req, res) {
      servers.getServerData(req.params.server, function(err, server){
        logger.debug("server edit: "+ req.params.server);
        logger.debug(server);
        middleware.render('admin/servers/edit', req, res, {server: server});
      });
    });

    app.get('/api/admin/servers', function (req, res) {
      servers.getAllServers(function(err, out){
        res.json({servers: out});
      });
    });
    app.get('/admin/servers', function (req, res) {
      middleware.render('admin/servers/all', req, res);
    });

    app.post('/admin/servers/create', function (req, res) {
        logger.info("Register a Server");
        var serverName = req.body.data.server;
        var desc = req.body.data.description;
        var port = req.body.data.port;

        var serverData = {
          host: serverName,
          desc: desc,
          status: undefined,
          port: port,
          users: req.body.data.users
        };

        servers.create(serverData, function(err){
          if (!err){
              logger.info("server created: ", serverData.host);
              res.json({redirect : '/admin/servers'});
          }else{
            //trigger an exception to client
            logger.error("Error creating server: ", err);
          }
        });
    });

    app.post('/admin/servers/edit/:server', function (req, res) {
        logger.info("Edit a Server");
        var serverName = req.body.data.server;
        var desc = req.body.data.description;
        var port = req.body.data.port;

        var serverData = {
          host: serverName,
          desc: desc,
          status: undefined,
          port: port,
          users: req.body.data.users
        };
        logger.debug(req.body.data.users);

        servers.edit(serverData, function(err){
          console.log(err);
          if (!err){
              res.json({redirect : '/admin/servers'});
          }else{
            //trigger an exception to client
          }
        });
    });
};
