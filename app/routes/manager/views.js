module.exports = function (app, options) {
    var middleware = require("../../middleware/middleware");
    app.get('/manager/permissions', function (req, res) {
      res.send("aaaa");
      return "aa";
    });

    app.post('/manager/pools', function (req, res) {
      // more code to save
      return res.send("success post");
    });

    app.get('/manager/', function (req, res) {
      res.send("admin theaters id ");
    });
};
