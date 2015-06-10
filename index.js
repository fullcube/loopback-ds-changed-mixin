var debug = require('debug')('loopback-ds-changed-mixin');
var utils = require('loopback-datasource-juggler/lib/utils');
var _ = require('lodash');

function changed(Model, options) {
  'use strict';

  debug('Changed mixin for Model %s', Model.modelName);

  var loopback = require('loopback');

  Model.observe('before save', function(ctx, next) {
    if (!ctx.hookState.changedItems) {
      ctx.hookState.changedItems = [];
    }

    if (ctx.currentInstance) {
      debug('Detected prototype.updateAttributes');
      var source = ctx.currentInstance;
      var target = ctx.data;
      if (Model.propertiesChanged(source, target, _.keys(options.properties))) {
        ctx.hookState.changedItems = [ctx.currentInstance.getId()];
      }
      next();
    } else if (ctx.instance) {
      // This is a new instance, so do nothing.
      if (ctx.isNewInstance) {
        next();
      } else {
        debug('Working with existing instance %o', ctx.instance);
        // Figure out which properties will have a changed status and store in
        // the context so that we can update these as part of after save.
        var where = {};
        where[Model.getIdName()] = ctx.instance.getId();
        Model.itemsWithChangedData(where, ctx.data)
          .then(function(items) {
            if (items && items.length) {
              ctx.hookState.changedItems = items;
            }
            next();
          }).catch(next);
      }
    } else {
      debug('anything else: updateAll');
      // Figure out which items will have a changed status and store in
      // the context so that we can update these as part of after save.
      Model.itemsWithChangedData(ctx.where, ctx.data)
        .then(function(items) {
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
        return options.callback(Model.extractChangedItemIds(items));
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
  Model.itemsWithChangedData = function(conditions, properties, cb) {
    cb = cb || utils.createPromiseCallback();
    properties = properties || {};
    conditions = conditions || {};

    var fields = {};
    _.forEach(properties, function(value, key) {
      fields[key] = {'neq' : value};
    });

    var filter = {
      fields: [
        Model.getIdName()
      ],
      where: {
        and: [fields, conditions]
      }
    };
    Model.find(filter)
      .then(function(results) {
        cb(null, Model.extractChangedItemIds(results));
      }).catch(cb);

    return cb.promise;
  };

  Model.extractChangedItemIds = function(items) {
    return _.pluck(items, Model.getIdName());
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

}

module.exports = function mixin(app) {
  app.loopback.modelBuilder.mixins.define('Changed', changed);
};
