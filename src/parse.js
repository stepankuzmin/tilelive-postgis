const os = require('os');
const url = require('url');
const path = require('path');

let username;
try {
  /* eslint-disable prefer-destructuring */
  username = os.userInfo().username;
} catch (e) {
  username = '';
}

const parse = (uri) => {
  const params = url.parse(uri, true, true);
  const { dir, base } = path.parse(params.pathname);

  const dbname = base;
  let { port, hostname } = params;
  if (!hostname && dir !== '/') {
    [hostname, port] = dir.split(':');
    port = parseInt(port, 10);
  }

  let user = username;
  let password = '';

  if (params.auth) {
    [user, password] = params.auth.split(':');
  }

  const { table, query } = params.query;
  const layerName = params.query.layerName || table;

  const defaultOptions = {
    type: 'postgis',
    host: hostname,
    port: port || 5432,
    dbname,
    user,
    password,
    table: query || table,
    layerName
  };

  return Object.assign({}, params.query, defaultOptions);
};

module.exports = parse;
