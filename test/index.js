/* eslint-disable import/no-extraneous-dependencies */

const test = require('tape');
const tilelive = require('tilelive');
const postgis = require('../index');

postgis.registerProtocols(tilelive);

const uri = 'postgis://localhost/test?table=test&geometry_field=geom&srid=4326';

test('tilelive-postgis', (t) => {
  tilelive.load(uri, (error, source) => {
    t.ifError(error);
    t.ok(source);
    source.getTile(0, 0, 0, (err, buffer, headers) => {
      t.ifError(err);
      t.ok(buffer);
      t.ok(headers);
      t.end();
    });
  });
});
