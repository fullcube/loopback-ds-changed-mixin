var utils = require('loopback-datasource-juggler/lib/utils');
var debug = require('debug')('loopback-ds-changed-mixin');

module.exports = function(Person) {
  // Define a function that should be called when a change is detected.
  Person.changeName = function(changeset, oldChangeset, cb) {
    cb = cb || utils.createPromiseCallback();
    debug('this.changeName() called with %o %o', changeset, oldChangeset);
    process.nextTick(function() {
      cb(null);
    });
    return cb.promise;
  };

  // Define a function that should be called when a change is detected.
  Person.changeStatus = function(changeset, oldChangeset, cb) {
    cb = cb || utils.createPromiseCallback();
    debug('this.changeStatus() called with %o %o', changeset, oldChangeset);
    process.nextTick(function() {
      cb(null);
    });
    return cb.promise;
  };

  // Define a function that should be called when a change is detected.
  Person.changeAge = function(changeset, oldChangeset, cb) {
    cb = cb || utils.createPromiseCallback();
    debug('this.changeAge() called with %o %o', changeset, oldChangeset);
    process.nextTick(function() {
      cb(null);
    });
    return cb.promise;
  };
};
