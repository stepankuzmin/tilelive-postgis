const os = require('os');
const test = require('tape');
const tilelive = require('@mapbox/tilelive');
const parse = require('../src/parse');
const postgis = require('../src/index');

const { username } = os.userInfo();
postgis.registerProtocols(tilelive);

test('tilelive-postgis parse', (t) => {
  t.deepEqual(parse('postgis://user:password@localhost/test?table=test&geometry_field=geom'), {
    type: 'postgis',
    dbname: 'test',
    host: 'localhost',
    port: 5432,
    user: 'user',
    password: 'password',
    geometry_field: 'geom',
    table: 'test',
    tableName: 'test'
  });

  t.deepEqual(parse('postgis:///var/run/postgresql:5433/test?table=test&geometry_field=geom'), {
    type: 'postgis',
    dbname: 'test',
    host: '/var/run/postgresql',
    port: 5433,
    user: username,
    password: '',
    geometry_field: 'geom',
    table: 'test',
    tableName: 'test'
  });

  const query = '(select * from test where st_intersects(geom, !bbox!)) as query';
  t.deepEqual(parse(`postgis:///var/run/postgresql/test?table=test&geometry_field=geom&query=${encodeURI(query)}`), {
    type: 'postgis',
    dbname: 'test',
    host: '/var/run/postgresql',
    port: 5432,
    user: username,
    password: '',
    geometry_field: 'geom',
    tableName: 'test',
    table: query,
    query
  });

  t.end();
});

test('tilelive-postgis', (t) => {
  const uri = 'postgis://localhost/test?table=test&geometry_field=geom';
  tilelive.load(uri, (error, source) => {
    t.ifError(error);
    t.ok(source);
    source.getTile(0, 0, 0, (err, buffer, headers) => {
      t.ifError(err);
      t.ok(buffer);
      t.ok(headers);
      source.close(t.end);
    });
  });
});
