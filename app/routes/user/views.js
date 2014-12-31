module.exports = function (app, options) {
  var logger = require('log4js').getLogger("User:view"),
      user = require("../../model/user"),
      middleware = require("../../middleware/middleware"),
      groups = require("../../model/groups"),
      servers = require("../../model/servers"),
      utils = require('./../../../public/utils');

  app.get('/user/:user', function (req, res) {
    // TODO implements a user page

    var userslug = utils.slugify(req.params.user);

    user.getUidByUsername(userslug, function(err, uid) {
      if (err) {
        return console.log(err);
      }
      
      user.getGroups(uid, function(data){
        objs = {
          objs: {
            user: {
              username: req.params.user
            },
            groups: data
          }
        };
        middleware.render('user/user', req, res, objs);
      });
    });
  });

  app.get('/user/:user/edit', function (req, res) {
    // TODO implements a user page
    objs = {
      objs: {
        user: {
          username: req.params.user
        }
      }
    };
    middleware.render('user/edit', req, res, objs);
  });

  app.get('/:user/keys', function (req, res) {
    middleware.render('user/keys', req, res);
  });

  app.get('/:user/keys/register', function (req, res) {
    middleware.render('user/keys/register', req, res);
  });

  app.get('/:user/keys/edit/:key', function (req, res) {
    user.sshkeys("mizore", function(err, obj){
      _ = require("underscore");
      key_title = _.keys(obj)[0];
      key_val = _.values(obj)[0];
      key = {
        title: key_title,
        value: key_val
      };

      middleware.render('user/keys/edit', req, res, {key : key});
    });
  });

  app.post('/:user/keys/edit/:key', function (req, res) {
    middleware.post(req, res, function(){
      res.json({redirect : '/' + req.params.user + '/keys'});
    });
  });

  app.get('/:user/keys/delete/:key', function (req, res) {
    middleware.get(req, res, function(){
      // TODO delete
      logger.info("Delete key: " + req.params.key);
      user.deleteSshkey(req.params.user, req.params.key, function(){
        middleware.redirect('/' + req.params.user + '/keys', res);
      });
    });
  });

  app.post('/:user/keys/register', function (req, res) {
    middleware.post(req, res, function(){
      user.addSshkey(req.user.username, req.body.data.title, req.body.data.key, function(err, obj){
        res.json( {redirect: '/' + req.params.user + '/keys'});
      });
    });
  });

  app.get('/api/:user/keys', function (req, res) {
    user.sshkeys(req.params.user, function(err, obj){
      res.json(obj);
    });
  });

  app.get('/inbox', function (req, res) {
    res.send("admin theaters id ");
  });

  app.get('/:user/permissions/request', function (req, res){
    middleware.render("user/access-request", req, res);
  });

  app.post('/:user/permissions/request', function (req, res){
    middleware.post(req, res, function(){
      var request = {
        host: req.body.data.hostname, 
        user: req.params.user,
        usertarget: req.body.data.targetuser,
        comment: req.body.data.comment,
        commentFrom: req.session.passport.user.username
      };

      servers.createPermissionRequest(request, function(err){
        if (err){
          logger.error(err);
        }
        res.json( {redirect: "/" + req.params.user + "/permissions"});
      });
    });
  });

  app.get('/:user/request/:id', function (req, res){
    middleware.render("user/access-request-edit", req, res, {id: req.params.id, username: req.params.user});
  });

  app.get('/:user/permissions', function (req, res){
    objs = {
      objs: {
        user: {
          username: req.params.user
        }
      }
    };
    middleware.render("user/permissions", req, res, objs);
  });

  app.get('/api/:user/permissions/pending', function (req, res){
    var options = {expand: true};

    if (req.params.user !== 'admin'){
        options = {expand: true, filter: {user: req.params.user}};
    }

    servers.listAllPermissions(options, function(err, permissions){
      logger.info("all permissions");
      res.json(permissions);
    });
  });

  app.get('/api/:user/permissions/detail/:id', function (req, res){
    var options = {expand: true};
    if (req.params.user !== 'admin'){
        options = {expand: true, filter: {user: req.params.user}};
    }

    servers.getPermissionData(req.params.id, options,function(err, permissions){
      res.json(permissions);
    });
    //res.json({id:req.params.id, username: "mizore", targetuser: "postgres", host: "server", lastupdate: "2014/07/10 10:45:15", comments: [{message: "hahaha", date: "12/12/2013"}]});
  });

  app.post('/:user/request/:id', function (req, res){
      // TODO check permissions to post.
    middleware.post(req, res,function(){
      logger.info("Update permission: " + req.params.id);
      var request = {
        id: req.params.id, 
        host: req.body.data.hostname, 
        user: req.params.user,
        usertarget: req.body.data.targetuser,
        comment: req.body.data.comment,
        commentFrom: req.session.passport.user.username
      };
      
      servers.editPermissionRequest(request, function(err){
        if (err){
          logger.error(err);
        }
        res.json( {redirect: "/" + req.params.user + "/permissions"});
      });
    });
  });

  app.get('/api/servers', function (req, res){
    res.json(["toto", "tutu"]);
  });

  app.get('/api/:user/permissions.json', function (req, res){
    var obj = [];
    // target users
    obj.push({
      "name": "target.user1",
      "color": "#F00",
      "imports": ["server.server1","server.server2"] 
    });
    //servers
    obj.push({
      "name": "server.server1",
      "color": "#AEF",
      "imports": ["target.user1"]
    });
    obj.push({
      "name": "server.server2",
      "color": "#AEF",
      "imports": ["target.user1"]
    });
    console.log(obj);
    res.json(obj);
  });

  //#{session.user.username}

  /*app.get('/api/:user/permissions/export', function (req, res){
    
  });*/
};
