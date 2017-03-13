const url = require('url');
const path = require('path');
const mapnik = require('mapnik');

const postgisInput = path.resolve(mapnik.settings.paths.input_plugins, 'postgis.input');
mapnik.register_datasource(postgisInput);

const PostgisSource = function PostgisSource(uri, callback) {
  const params = url.parse(uri);
  const srs = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs';

  const [user, password] = params.auth.split(':');
  const { table, geometry_field, srid } = params.query;

  const options = {
    type: 'postgis',
    host: params.hostname,
    port: params.port,
    dbname: params.pathname.replace(/^\//, ''),
    user,
    password,
    table,
    geometry_field,
    srid
  };

  const datasource = new mapnik.Datasource(options);
  const layer = new mapnik.Layer(table, srs);
  layer.datasource = datasource;

  const map = new mapnik.Map(256, 256, srs);
  map.add_layer(layer);
  this._map = map;

  this._info = {
    id: table,
    name: table,
    format: 'pbf',
    bounds: datasource.extent(),
    fields: datasource.fields()
  };

  callback(null, this);
  return undefined;
};

PostgisSource.registerProtocols = function registerProtocols(tilelive) {
  /* eslint-disable no-param-reassign */
  tilelive.protocols['postgis:'] = this;
};

PostgisSource.prototype.getInfo = function getInfo(callback) {
  callback(null, this._info);
};

PostgisSource.prototype.getTile = function getTile(z, x, y, callback) {
  const headers = {};
  headers['Content-Type'] = 'application/x-protobuf';

  const vt = new mapnik.VectorTile(z, x, y);
  this._map.render(vt, {}, (error, tile) => {
    if (error) {
      return callback(error);
    }

    if (tile.empty()) {
      return callback(new Error('Tile does not exist'), null, headers);
    }

    tile.getData({ compression: 'gzip' }, (err, data) => {
      if (err) {
        return callback(err);
      }

      headers['Content-Encoding'] = 'gzip';
      return callback(err, data, headers);
    });

    return undefined;
  });
};

module.exports = PostgisSource;
