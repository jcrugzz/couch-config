var test = require('tap').test;
var couchConfig = require('../');

var path = require('path');
var config = require(path.join(__dirname, '..', 'config', 'config.json'));

test('ensure this thing works and returns properly', function (t) {
  t.plan(1);
  config.modifier = function (obj) {
    return Object.keys(obj).reduce(function (acc, key) {
      var pieces = obj[key].split('/');
      pieces[pieces.length - 2] = 'app';
      acc[key] = pieces.join('/');
      return acc;
    }, {});
  }
  couchConfig(config, function (err) {
    if (err) {
      return t.fail(err);
    }
    t.pass('we good');
  })

});
