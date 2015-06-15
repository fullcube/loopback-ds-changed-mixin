var debug = require('debug')('loopback-ds-changed-mixin');
var utils = require('loopback-datasource-juggler/lib/utils');
var _ = require('lodash');

function changed(Model, options) {
  'use strict';

  if (typeof Model[options.callback] !== 'function') {
    console.warn('Callback %s is not a model function', options.callback);
  }

  debug('Changed mixin for Model %s', Model.modelName);

  var loopback = require('loopback');

  Model.observe('before save', function(ctx, next) {
    // Do nothing if a new instance if being created.
    if (ctx.instance && ctx.isNewInstance) {
      return next();
    }

    if (!ctx.hookState.changedItems) {
      ctx.hookState.changedItems = [];
    }

    var properties = _.keys(options.properties);

    debug('before save ctx.instance: %o', ctx.instance);
    debug('before save ctx.currentInstance: %o', ctx.currentInstance);
    debug('before save ctx.data: %o', ctx.data);
    debug('before save ctx.where: %o', ctx.where);

    if (ctx.currentInstance) {
      debug('Detected prototype.updateAttributes');
      if (Model.propertiesChanged(ctx.currentInstance, ctx.data, properties)) {
        ctx.hookState.changedItems = [ctx.currentInstance.getId()];
      }
      next();
    } else if (ctx.instance) {
      debug('Working with existing instance %o', ctx.instance);
      // Figure out wether this item has changed properties.
      ctx.instance.itemHasChangedProperties(ctx.instance, properties)
        .then(function(changed) {
          if (changed) {
            ctx.hookState.changedItems = [ctx.instance.getId()];
          }
          next();
        }).catch(next);
    } else {
      debug('anything else: upsert, updateAll');
      // Figure out which items have changed properties.
      Model.itemsWithChangedProperties(ctx.where, ctx.data, properties)
        .then(function(items) {
          debug('items: %o', ctx.items);
          if (items && items.length) {
            ctx.hookState.changedItems = items;
          }
          next();
        }).catch(next);
    }
  });

  Model.observe('after save', function(ctx, next) {
    if (ctx.hookState.changedItems && ctx.hookState.changedItems.length) {
      Model.find({
        where: {
          id: {
            inq: ctx.hookState.changedItems
          }
        },
        fields: [
          Model.getIdName()
        ]
      }).then(function(items) {
        if (typeof Model[options.callback] !== 'function') return false;
        return Model[options.callback](Model.extractChangedItemIds(items));
      })
      .then(function(res) {
        next();
      }).catch(next);
    } else {
      next();
    }
  });

  /**
   * Searches for items with properties that differ from a specific set.
   *
   * @param {Object} conditions Where clause detailing items to compare.
   * @param {Object} properties Properties to compare with the found instances.
   * @param {Function} cb A Cllback function.
   * @returns {Array} Returns a list of Model instance Ids whose data differ from
   *                  that in the properties argument.
   */
  Model.itemsWithChangedProperties = function(conditions, target, properties, cb) {
    debug('Looking for items with changed properties...');
    debug('conditions is: %o', conditions);
    debug('target is: %o', target);
    debug('properties is: %o', properties);
    cb = cb || utils.createPromiseCallback();

    conditions = conditions || {};
    target = typeof target.toJSON === 'function' ? target.toJSON() : target || {};
    properties = properties || {};

    // Build up a list of property conditions to include in the query.
    var fields = {or: []};
    _.forEach(target, function(value, key) {
      if (_.includes(properties, key)) {
        var fieldFilter = {};
        fieldFilter[key] = {'neq': value};
        fields.or.push(fieldFilter);
      }
    });

    if (!fields.or.length) fields = {};

    // If there are no property conditions, do nothing.
    if (_.isEmpty(properties)) {
      process.nextTick(function() {
        cb(null, false);
      });
      return cb.promise;
    }

    // Build the final filter.
    var filter = {
      fields: [
        Model.getIdName()
      ],
      where: {
        and: [fields, conditions]
      }
    };
    debug('Searching using filter: %s', JSON.stringify(filter, null, 4));
    Model.find(filter)
      .then(function(results) {
        debug('Found items that will be changed: %o', results);
        cb(null, Model.extractChangedItemIds(results));
      }).catch(cb);

    return cb.promise;
  };

  /**
   * Compare self with data to see if specific properties have been altered.
   *
   * @param {Object} data Target object to compare with.
   * @param {Array} properties List of properties to be chacked.
   * @returns {Boolean} Returns true if the properties have been altered.
   */
  Model.prototype.itemHasChangedProperties = function(data, properties, cb) {
    cb = cb || utils.createPromiseCallback();

    properties = properties || {};

    if (_.isEmpty(properties)) {
      process.nextTick(function() {
        cb(null, false);
      });
      return cb.promise;
    }

    Model.findById(this.getId())
      .then(function(instance) {
        var changed = Model.propertiesChanged(instance, data, properties);
        debug('found supposedly changed items: %o', changed);
        cb(null, changed);
      }).catch(cb);

    return cb.promise;
  };

  /**
   * Compare source and target objects to see if specific properties have
   * been altered.
   *
   * @param {Object} source Source object to compare against.
   * @param {Object} target Target object to compare with.
   * @param {Array} properties List of properties to be chacked.
   * @returns {Boolean} Returns true if the properties have been altered.
   */
  Model.propertiesChanged = function(source, target, properties) {
    debug('comparing source %o with target %o in properties %o', source, target, properties);

    var changed = false;
    _.forEach(properties, function(key) {
      debug('checking property %s ', key);
      if (target[key]) {
        if (!source[key] || target[key] !== source[key]) {
          changed = true;
        }
      }
    });
    if (changed) {
      debug('properties were changed');
    }
    return changed;
  };

  Model.extractChangedItemIds = function(items) {
    return _.pluck(items, Model.getIdName());
  };

}

module.exports = function mixin(app) {
  app.loopback.modelBuilder.mixins.define('Changed', changed);
};
