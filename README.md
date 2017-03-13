# tilelive-postgis

[![Build Status](https://travis-ci.org/stepankuzmin/tilelive-postgis.svg?branch=master)](https://travis-ci.org/stepankuzmin/tilelive-postgis)

Implements the tilelive API for generating mapnik vector tiles from PostGIS.

## Installation

```shell
npm install tilelive-postgis
```

## Usage

```js
const tilelive = require('tilelive');
require('tilelive-postgis').registerProtocols(tilelive);

const uri = 'postgis://user:password@localhost:5432/test?table=test_table&geometry_field=geometry&srid=4326';
tilelive.load(uri, function(error, source) {
  if (error) throw error;

  source.getTile(0, 0, 0, function(error, tile, headers) {
    // `error` is an erroror object when generation failed, otherwise null.
    // `tile` contains the compressed image file as a Buffer
    // `headers` is a hash with HTTP headers for the image.
  });
});
```
