/* eslint no-console: 0 */

'use strict'

const debug = require('debug')('loopback-ds-changed-mixin')
const utils = require('loopback-datasource-juggler/lib/utils')
const _ = require('lodash')
const async = require('async')
const util = require('util')

module.exports = function changedMixin(Model, options) {
  // Trigger a warning and remove the property from the watchlist when one of
  // the property is not found on the model or the defined callback is not found
  _.mapKeys(options.properties, (callback, property) => {
    if (_.isUndefined(Model.definition.properties[property])) {
      debug('Property %s on %s is undefined', property, Model.modelName)
    }

    if (typeof Model[callback] !== 'function') {
      debug('Callback %s for %s is not a model function', callback, property)
    }
  })

  debug('Changed mixin for Model %s with properties', Model.modelName, options.properties)

  // This is the structure that we want to return
  function ChangeSet(changeset) {
    this.ids = changeset.ids
    this.values = changeset.values
  }
  ChangeSet.prototype.getIdList = function getIdList() {
    return Object.keys(this.ids)
  }
  ChangeSet.prototype.getIds = function getIds() {
    return this.ids
  }
  ChangeSet.prototype.getId = function getId(id) {
    return this.ids[id]
  }
  ChangeSet.prototype.getValueList = function getValueList() {
    return Object.keys(this.values)
  }
  ChangeSet.prototype.getValues = function getValues() {
    return this.values
  }
  ChangeSet.prototype.getValue = function getValue(value) {
    return this.values[value]
  }

  /**
   * Helper method that converts the set of items to a set of property
   * In the future this structure should be used directly by the code
   * that detects the changes.
   *
   * Input:
   *
   * {
   *    '5586c51948fb091e068f80f4': {
   *        status: 'pending'
   *    },
   *    '5586c51948fb091e068f80f5': {
   *        status: 'pending'
   *    }
   * }
   *
   * Output:
   *
   * {
   *    status: {
   *        ids: {
   *            '5586c58848fb091e068f8115': 'pending',
   *            '5586c58848fb091e068f8116': 'pending'
   *        },
   *        values: {
   *            pending: [
   *                '5586c58848fb091e068f8115',
   *                '5586c58848fb091e068f8116'
   *            ]
   *        }
   *    }
   * }
   *
   * @returns {{}}
   */
  function convertItemsToProperties(items) {

    // The object that contains the converted items
    const result = {}

    // Loop through all the inserted items
    _.mapKeys(items, (changes, itemId) => {

      // Loop through changes for this item
      _.mapKeys(changes, (value, property) => {

        // Add basic structure to hold ids and values
        if (_.isUndefined(result[property])) {
          result[property] = { ids: {}, values: {} }
        }

        // Create an array to hold ids for each value
        if (_.isUndefined(result[property].values[value])) {
          result[property].values[value] = []
        }

        // Create an object { itemId: value }
        result[property].ids[itemId] = value

        // Enter itemId in the array for this value
        result[property].values[value].push(itemId)
      })

    })

    const changedProperties = {}

    _.mapKeys(result, (changeset, property) => {
      changedProperties[property] = new ChangeSet(changeset)
    })

    return changedProperties
  }

  /**
   * Determine which properties are changed and store them in changedItems
   */
  Model.observe('before save', (ctx, next) => {
    // Do nothing if a new instance if being created.
    if (ctx.instance && ctx.isNewInstance) {
      return next()
    }

    // Do nothing if the caller has chosen to skip the changed mixin.
    if (ctx.options && ctx.options.skipChanged && typeof ctx.options.skipChanged === 'boolean') {
      debug('skipping changed mixin')
      return next()
    }

    if (!ctx.hookState.changedItems) {
      ctx.hookState.changedItems = []
    }

    const properties = _.keys(options.properties)

    debug('before save ctx.instance: %o', ctx.instance)
    debug('before save ctx.currentInstance: %o', ctx.currentInstance)
    debug('before save ctx.data: %o', ctx.data)
    debug('before save ctx.where: %o', ctx.where)

    if (ctx.currentInstance) {
      debug('Detected prototype.updateAttributes')
      ctx.hookState.changedItems = Model.getChangedProperties(ctx.currentInstance, ctx.data, properties)
      return next()
    }
    else if (ctx.instance) {
      debug('Working with existing instance %o', ctx.instance)
      // Figure out wether this item has changed properties.
      return ctx.instance.itemHasChangedProperties(ctx.instance, properties)
        .then(changed => (ctx.hookState.changedItems = changed))
    }
    debug('anything else: upsert, updateAll')
    // Figure out which items have changed properties.
    return Model.itemsWithChangedProperties(ctx.where, ctx.data, properties)
      .then(changed => (ctx.hookState.changedItems = changed))
  })

  Model.observe('after save', (ctx, next) => {

    // Convert the changeItems to Properties
    if (ctx.hookState.changedItems && !_.isEmpty(ctx.hookState.changedItems)) {
      const properties = convertItemsToProperties(ctx.hookState.changedItems)

      debug('after save changedProperties %o', properties)

      return async.forEachOf(properties, (changeset, property, cb) => {
        const callback = options.properties[property]

        if (ctx.options && ctx.options.skipChanged && Model.shouldSkipProperty(property, ctx.options.skipChanged)) {
          debug('skipping changed callback for', property)
          return cb()
        }
        if (typeof Model[callback] !== 'function') {
          return cb(new Error(util.format('Function %s not found on Model', callback)))
        }
        debug('after save: invoke %s with %o', callback, changeset)
        return Model[callback](changeset).then(() => cb()).catch(cb)
      }, err => {
        if (err) {
          console.error(err)
        }
        return next()
      })
    }
    return next()
  })

  Model.shouldSkipProperty = function shouldSkipProperty(property, skipChanged) {
    if (typeof skipChanged === 'boolean') {
      return skipChanged
    }
    else if (typeof skipChanged === 'string') {
      return property === skipChanged
    }
    else if (Array.isArray(skipChanged)) {
      return _.includes(skipChanged, property)
    }
    else if (typeof skipChanged === 'object') {
      return _.find(skipChanged, property, true)
    }
    return false
  }

  /**
   * Searches for items with properties that differ from a specific set.
   *
   * @param {Object} conditions Where clause detailing items to compare.
   * @param {Object} newVals New values.
   * @param {Object} properties Properties to compare with the found instances.
   * @param {Function} cb A Cllback function.
   * @returns {Array} Returns a list of Model instance Ids whose data differ from
   *                  that in the properties argument.
   */
  Model.itemsWithChangedProperties = function itemsWithChangedProperties(conditions, newVals, properties, cb) {
    debug('itemsWithChangedProperties: Looking for items with changed properties...')
    debug('itemsWithChangedProperties: conditions is: %o', conditions)
    debug('itemsWithChangedProperties: newVals is: %o', newVals)
    debug('itemsWithChangedProperties: properties is 1 : %o', properties)
    cb = cb || utils.createPromiseCallback()

    conditions = conditions || {}
    newVals = typeof newVals.toJSON === 'function' ? newVals.toJSON() : newVals || {}
    properties = properties || {}

    const filterFields = [
      Model.getIdName(),
    ]

    // Build up a list of property conditions to include in the query.
    let propertyConditions = { or: [] }

    _.forEach(newVals, (value, key) => {
      if (_.includes(properties, key)) {
        const fieldFilter = {}

        fieldFilter[key] = { 'neq': value }
        propertyConditions.or.push(fieldFilter)
        filterFields.push(key)
      }
    })

    if (!propertyConditions.or.length) {
      propertyConditions = {}
    }

    debug('itemsWithChangedProperties: propertyConditions 1 : %o', propertyConditions)

    // If there are no property conditions, do nothing.
    if (_.isEmpty(propertyConditions)) {
      process.nextTick(() => {
        cb(null, false)
      })
      return cb.promise
    }

    // Build the final filter.
    const filter = {
      fields: filterFields,
      where: {
        and: [ propertyConditions, conditions ],
      },
    }

    debug('itemsWithChangedProperties: propertyConditions 2 : %o', propertyConditions)
    debug('itemsWithChangedProperties: filter Fields %o', filterFields)
    debug('itemsWithChangedProperties: conditions %o', conditions)
    debug('itemsWithChangedProperties: final filter %o', filter)

    Model.find(filter)
      .then(results => {

        debug('itemsWithChangedProperties: filter results %o', results)

        const changedProperties = {}

        results.forEach(oldVals => {
          debug('itemsWithChangedProperties: oldVals %o', oldVals)
          debug('itemsWithChangedProperties: newVals %o', newVals)

          // changedProperties[oldVals.id] = {};

          const changed = {}

          properties.forEach(property => {
            debug('itemsWithChangedProperties: Matching property %s', property)

            if (typeof newVals[property] !== 'undefined') {
              const newVal = newVals[property]

              debug('itemsWithChangedProperties:   - newVal %s : %s : ', property, newVal)

              if (!oldVals[property]) {
                changed[property] = newVal
                debug('itemsWithChangedProperties:   - no oldVal %s : %s : ', property, newVal)
              }
              else if (!_.isEqual(oldVals[property], newVal)) {
                const oldVal = oldVals[property]

                debug('itemsWithChangedProperties:   - oldVal %s : %s : ', property, oldVal)
                changed[property] = newVal
              }

            }
          })

          debug('itemsWithChangedProperties: changed %o', changed)
          changedProperties[oldVals.id] = changed
        })

        debug('itemsWithChangedProperties: changedProperties %o', changedProperties)
        cb(null, changedProperties)
      }).catch(cb)

    return cb.promise
  }

  /**
   * Compare self with data to see if specific properties have been altered.
   *
   * @param {Object} data Target object to compare with.
   * @param {Array} properties List of properties to be chacked.
   * @returns {Boolean} Returns true if the properties have been altered.
   */
  Model.prototype.itemHasChangedProperties = function itemHasChangedProperties(data, properties, cb) {
    cb = cb || utils.createPromiseCallback()

    properties = properties || {}

    if (_.isEmpty(properties)) {
      process.nextTick(() => {
        cb(null, false)
      })
      return cb.promise
    }

    Model.findById(this.getId())
      .then(instance => {
        const changedProperties = Model.getChangedProperties(instance, data, properties)

        debug('itemHasChangedProperties: found supposedly changed items: %o', changedProperties)
        cb(null, changedProperties)
      }).catch(cb)

    return cb.promise
  }

  /**
   * Compare source and target objects to see if specific properties have
   * been altered.
   *
   * @param {Object} source Source object to compare against.
   * @param {Object} target Target object to compare with.
   * @param {Array} properties List of properties to be chacked.
   * @returns {Boolean} Returns true if the properties have been altered.
   */
  Model.propertiesChanged = function propertiesChanged(source, target, properties) {
    debug('comparing source %o with target %o in properties %o', source, target, properties)

    let changed = false

    _.forEach(properties, key => {
      debug('checking property %s ', key)
      if (target[key]) {
        if (!source[key] || target[key] !== source[key]) {
          changed = true
        }
      }
    })
    if (changed) {
      debug('propertiesChanged: properties were changed')
    }
    return changed
  }

  Model.getChangedProperties = function getChangedProperties(oldVals, newVals, properties) {
    debug('getChangedProperties: comparing oldVals %o with newVals %o in properties %o', oldVals, newVals, properties)

    const itemId = oldVals[Model.getIdName()]
    const changedProperties = {}

    changedProperties[itemId] = {}

    _.forEach(properties, key => {
      debug('getChangedProperties: - checking property %s ', key)

      if (newVals[key]) {
        const newVal = newVals[key]

        debug('getChangedProperties:   - new value %s ', newVal)

        if (!oldVals[key] || !_.isEqual(oldVals[key], newVal)) {
          debug('getChangedProperties:   - changed or new value: %s itemId: %s', newVal, itemId)

          changedProperties[itemId][key] = newVal
        }
      }
    })
    if (!_.isEmpty(changedProperties[itemId])) {
      debug('getChangedProperties: Properties were changed %o', changedProperties)
      return changedProperties
    }
    return false
  }

  Model.extractChangedItemIds = function extractChangedItemIds(items) {
    return _.pluck(items, Model.getIdName())
  }

}
