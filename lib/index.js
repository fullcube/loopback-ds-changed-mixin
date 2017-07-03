'use strict'

const deprecate = require('depd')('loopback-ds-changed-mixin')
const changed = require('./changed')

module.exports = function mixin(app) {
  app.loopback.modelBuilder.mixins.define = deprecate.function(app.loopback.modelBuilder.mixins.define,
    'app.modelBuilder.mixins.define: Use mixinSources instead')
  app.loopback.modelBuilder.mixins.define('Changed', changed)
}
