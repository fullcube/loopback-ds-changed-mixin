const utils = require('loopback-datasource-juggler/lib/utils')
const debug = require('debug')('loopback-ds-changed-mixin')

module.exports = function(Person) {
  // Define a function that should be called when a change is detected.
  Person.changeName = function(args, cb) {
    cb = cb || utils.createPromiseCallback()
    debug('this.changeName() called with %o', args)
    process.nextTick(function() {
      cb(null)
    })
    return cb.promise
  }

  // Define a function that should be called when a change is detected.
  Person.changeStatus = function(args, cb) {
    cb = cb || utils.createPromiseCallback()
    debug('this.changeStatus() called with %o', args)
    process.nextTick(function() {
      cb(null)
    })
    return cb.promise
  }

  // Define a function that should be called when a change is detected.
  Person.changeAge = function(args, cb) {
    cb = cb || utils.createPromiseCallback()
    debug('this.changeAge() called with %o', args)
    process.nextTick(function() {
      cb(null)
    })
    return cb.promise
  }
}
