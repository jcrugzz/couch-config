var test = require('tap').test;
var couchConfig = require('../');

var path = require('path');
var config = require(path.join(__dirname, '..', 'config', 'config.json'));

test('ensure this thing works and returns properly', function (t) {
  t.plan(1);

  couchConfig(config, function (err) {
    if (err) {
      return t.fail(err);
    }
    t.pass('we good');
  })

});
