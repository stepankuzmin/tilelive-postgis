const path = require('path');
const mapnik = require('mapnik');
const mapnikPool = require('mapnik-pool')(mapnik);
const parse = require('./parse');

const postgisInput = path.resolve(mapnik.settings.paths.input_plugins, 'postgis.input');
mapnik.register_datasource(postgisInput);

const srs = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over';

const PostgisSource = function PostgisSource(uri, callback) {
  const options = parse(uri);

  const { layerName } = options;
  delete options.layerName;

  const datasource = new mapnik.Datasource(options);
  const layer = new mapnik.Layer(layerName);
  layer.datasource = datasource;

  const map = new mapnik.Map(256, 256, srs);
  map.add_layer(layer);

  const xml = map.toXML();
  this._pool = mapnikPool.fromString(xml);

  this._info = {
    id: layerName,
    name: layerName,
    format: 'pbf',
    scheme: 'tms',
    bounds: datasource.extent(),
    fields: datasource.fields()
  };

  callback(null, this);
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

      tile.getData({ compression: 'gzip', release: true }, (error, data) => {
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
