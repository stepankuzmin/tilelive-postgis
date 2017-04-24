const os = require('os');
const url = require('url');
const path = require('path');

const { username } = os.userInfo();

const parse = (uri) => {
  const params = url.parse(uri, true, true);
  const { dir, base } = path.parse(params.pathname);

  const dbname = base;
  let port = params.port;
  let host = params.hostname;
  if (!host && dir !== '/') {
    [host, port] = dir.split(':');
    port = parseInt(port, 10);
  }

  let user = username;
  let password = '';

  if (params.auth) {
    [user, password] = params.auth.split(':');
  }

  const { table, query } = params.query;

  const defaultOptions = {
    type: 'postgis',
    host,
    port: port || 5432,
    dbname,
    user,
    password,
    tableName: table,
    table: query || table
  };

  return Object.assign({}, params.query, defaultOptions);
};

module.exports = parse;
