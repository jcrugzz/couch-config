
var url = require('url');
var spliceAuth = require('splice-auth');
var request = require('request').defaults({ strictSSL: false });

module.exports = CouchConfig;
//
// Make this handle a single or multi couch config modifier for variable
// keys. Also make this its own module
//

function CouchConfig (opts, callback) {
  if (!(this instanceof CouchConfig)) { return new CouchConfig(opts, callback) }

  this.couches = !Array.isArray(opts.couches || opts.couch)
    ? [opts.couches || opts.couch]
    : opts.couches || opts.couch;

  this.admins = opts.admins || {};
  this.section = opts.section || 'vhosts';
  this.route = '/_config/' + this.section;
  this._callback = callback && typeof callback === 'function'
    ? callback
    : undefined;

  this.returned = false;
  if (!this._callback) { throw new Error('Must provide callback') }

  //
  // Splice in auth based on whats passed in
  //
  this.couches = this.couches.map(function (couch) {
    var _couch = url.parse(couch);
    return spliceAuth(_couch.href, this.admins[_couch.hostname]);
  }, this);
  //
  // Top level counter
  //
  this.count = this.couches.length;
  //
  // Setup counter object for each couch and the updates it has to do
  //
  this.counters = this.couches.reduce(function (acc, couch) {
    acc[couch] = 0;
    return acc;
  }, {});

  this.iterate();
};

CouchConfig.prototype.error = function (err) {
  if (!this.returned) {
    this.returned = true;
    this._callback(err);
  }
};

CouchConfig.prototype.iterate = function() {
  this.couches.forEach(this.fetch.bind(this));
};

CouchConfig.prototype.fetch = function (couch) {
  var opts = {};
  opts.method = 'GET';
  opts.uri = couch + this.route;
  opts.json = true;

  request(opts, this.modify.bind(this, couch));
};

CouchConfig.prototype.modify = function (couch, err, res, body) {
  if (err || res.statusCode != 200) {
    return this.error(err || new Error('fetch request failed for particular config value '
                                      + res.statusCode));
  }
  var obj = Object.keys(body).reduce(function (acc, key) {
    //
    // TODO: this will be generic and be WAY more variable with detection and
    // shit for what we are getting back and if its a section get or if its
    // a single key or whatever
    //
    var pieces = body[key].split('/');
    pieces[pieces.length - 2] = 'app';
    acc[key] = pieces.join('/');
    return acc;
  }, {});

  this.updateObj(couch, obj);
};

CouchConfig.prototype.updateObj = function (couch, config) {
  var keys = Object.keys(config);
  this.counters[couch] = keys.length;
  keys.forEach(function (key) {
    this.update(couch, key, config[key]);
  }, this);
};

CouchConfig.prototype.update = function (couch, key, value) {
  var opts = {};
  opts.method = 'PUT';
  opts.uri = couch + this.route + '/' + key;
  opts.json = value;

  request(opts, this.onUpdateRes.bind(this, couch));
};

CouchConfig.prototype.onUpdateRes = function (couch, err, res, body) {
  if (err || res.statusCode != 200) {
    return this.error(err || new Error('update config for ' + couch + ' with ' + res.statusCode));
  }
  this.onFinish(couch);
};

//
// Assess the counters to see if it is time to return yet
//
CouchConfig.prototype.onFinish = function (couch) {
  if (--this.counters[couch] === 0) {
    return --this.count === 0
      ? this._callback(null, null)
      : function () {};
  }
};
