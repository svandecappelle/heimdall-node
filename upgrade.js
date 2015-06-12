var pg = require('pg');
var logger = require('log4js').getLogger("Upgrader");
var conString = "postgres://heimdall:heimdall@localhost/heimdall";

var client = new pg.Client(conString);
client.on('drain', client.end.bind(client)); //disconnect client when all queries are finished

client.connect();

// TODO user object style of coding.

logger.info("Migrating configured servers...");
logger.info("Checking configured servers");

var querySqlToBackup = 'SELECT * FROM heimdall_server';
var query = client.query(querySqlToBackup);
query.on('row', function(row) {
  logger.debug('server "%s" [%s] is listening ssh port on %d', row.hostname, row.description, row.port);
});

query.on('end', function(result) {
  logger.debug('All servers[%d] have been checked', result.rowCount);
  // TODO store into redis.
  logger.info("All configured servers migrated successfully.");
});

query.on('error', function(error) {
  logger.error('Error executing query: ', querySqlToBackup, error);
});


// Users
logger.info("Migrating configured users...");
logger.info("Checking configured users");

var querySqlToBackup = 'SELECT * FROM auth_user';
var query = client.query(querySqlToBackup);
query.on('row', function(row) {
  logger.debug('user configured to heimdall: ', row);
});

query.on('end', function(result) {
  logger.debug('All users[%d] have been checked', result.rowCount);
  logger.info("All configured users migrated successfully.");
});

query.on('error', function(error) {
  logger.error('Error executing query: ', querySqlToBackup, error);
});

