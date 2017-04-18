const os = require('os');
const url = require('url');
const path = require('path');
const mapnik = require('mapnik');
const ptolemy = require('ptolemy');
const mapnikPool = require('mapnik-pool')(mapnik);

const postgisInput = path.resolve(mapnik.settings.paths.input_plugins, 'postgis.input');
mapnik.register_datasource(postgisInput);

const PostgisSource = function PostgisSource(uri, callback) {
  const params = url.parse(uri);

  const { username } = os.userInfo();

  let user = username;
  let password = '';

  if (params.auth) {
    [user, password] = params.auth.split(':');
  }

  const { table } = params.query;
  const srid = params.query.srid || 4326;

  const defaultOptions = {
    type: 'postgis',
    host: params.hostname,
    port: params.port || 5432,
    dbname: params.pathname.replace(/^\//, ''),
    user,
    password
  };

  const options = Object.assign({}, defaultOptions, params.query);

  ptolemy.get('3857', 'proj4', (err, srs3857) => {
    if (err) {
      callback(err);
    }

    ptolemy.get(srid, 'proj4', (error, srs) => {
      if (error) {
        callback(error);
      }

      const datasource = new mapnik.Datasource(options);
      const layer = new mapnik.Layer(table, srs);
      layer.datasource = datasource;

      const map = new mapnik.Map(256, 256, srs3857);
      map.add_layer(layer);

      const xml = map.toXML();
      this._pool = mapnikPool.fromString(xml);

      this._info = {
        id: table,
        name: table,
        format: 'pbf',
        scheme: 'tms',
        bounds: datasource.extent(),
        fields: datasource.fields()
      };

      callback(null, this);
    });
  });
};

PostgisSource.registerProtocols = function registerProtocols(tilelive) {
  /* eslint-disable no-param-reassign */
  tilelive.protocols['postgis:'] = this;
};

PostgisSource.prototype.getInfo = function getInfo(callback) {
  callback(null, this._info);
};

PostgisSource.prototype.getTile = function getTile(z, x, y, callback) {
  /* eslint-disable consistent-return */
  const headers = {};
  headers['Content-Type'] = 'application/x-protobuf';

  const vt = new mapnik.VectorTile(z, x, y);

  const options = { threading_mode: mapnik.threadingMode.async };
  this._pool.acquire((poolError, map) => {
    if (poolError) {
      this._pool.release(map);
      return callback(poolError);
    }

    map.render(vt, options, (tileError, tile) => {
      if (tileError) {
        this._pool.release(map);
        return callback(tileError);
      }

      if (tile.empty()) {
        this._pool.release(map);
        return callback(new Error('Tile does not exist'), null, headers);
      }

      tile.getData({ compression: 'gzip' }, (error, data) => {
        this._pool.release(map);
        if (error) {
          return callback(error);
        }

        headers['Content-Encoding'] = 'gzip';
        return callback(null, data, headers);
      });
    });
  });
};

PostgisSource.prototype.close = function close(callback) {
  this._pool.destroyAllNow(callback);
};

module.exports = PostgisSource;
