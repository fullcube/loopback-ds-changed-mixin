CHANGED
=============

[![Greenkeeper badge](https://badges.greenkeeper.io/fullcube/loopback-ds-changed-mixin.svg)](https://greenkeeper.io/)

[![Circle CI](https://circleci.com/gh/fullcube/loopback-ds-changed-mixin.svg?style=svg)](https://circleci.com/gh/fullcube/loopback-ds-changed-mixin) [![Coverage Status](https://coveralls.io/repos/github/fullcube/loopback-ds-changed-mixin/badge.svg?branch=master)](https://coveralls.io/github/fullcube/loopback-ds-changed-mixin?branch=master) [![Dependencies](http://img.shields.io/david/fullcube/loopback-ds-changed-mixin.svg?style=flat)](https://david-dm.org/fullcube/loopback-ds-changed-mixin) [![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

This module is designed for the [Strongloop Loopback](https://github.com/strongloop/loopback) framework.
It provides a mixin that makes it possible to trigger a function if selected
model properties change.

The property value is an object that details model properties to be
watched as well as the callback function to be trigged.

INSTALL
=============

```bash
npm install --save loopback-ds-changed-mixin
```

SERVER CONFIG
=============
Add the mixins property to your server/model-config.json:

```
{
  "_meta": {
    "sources": [
      "loopback/common/models",
      "loopback/server/models",
      "../common/models",
      "./models"
    ],
    "mixins": [
      "loopback/common/mixins",
      "../node_modules/loopback-ds-changed-mixin/lib",
      "../common/mixins"
    ]
  }
}
```

MODEL CONFIG
=============

To use with your Models add the `mixins` attribute to the definition object of
your model config.

```json
{
    "name": "Widget",
    "properties": {
        "name": "String",
        "description": "String",
        "status": "String"
    },
    "mixins": {
        "Changed": {
            "properties": {
                "name": "changeName",
                "status": "changeStatus",
            }
        }
    }
}
```

In the above, if the status property is modified on one of more model instances, the function that is defined at the
property will be executed with a ChangeSet as a parameter.


```javascript

// The ChangeSet object passed here has several helper methods    
function changeName(changeSet) {

    // Return an array of all the ID's in this change set
    changeSet.getIdList();

    // Return an object with all the ID's and their new values
    changeSet.getIds();

    // Return the value for a given ID
    changeSet.getId(id);

    // Return an array of all the unique values in this change set
    changeSet.getValueList();

    // Return an object with all the Values and an array of the ID's changed to this value
    changeSet.getValues();

    // Return an array of all the ID's changed to a given value
    changeSet.getValue(value);

    // The raw data is available as well
    changeSet.ids;
    changeSet.values;

}

```


OPTIONS
=============

The specific fields that are to be marked as changed can be set by passing an
object to the mixin options.

In this example we mark the `status` and `productId` properties for change notifications. The value of each property
defined here is the name of the callback method that is invoked when changes on that property is detected.

```json
{
  "name": "Widget",
  "properties": {
      "name": "String",
      "description": "String",
      "status": "String"
  },
  "mixins": {
    "Changed": {
      "properties": {
        "name": "changeName",
        "status": "changeStatus",
      }
    }
  }
}
```

You can selectively skip the changed mixin behavior in calls to loopback update methods by setting the
`skipChange` option. This can be a boolean to skip the behavior on all properties, a string to skip the behavior
for a single property, or an array or object to skip the behavior for multiple properties.

```javascript
instance.save({skipChanged: true}); // skip behavior
instance.save({skipChanged: 'name'}); // skip behavior for the properties.
instance.save({skipChanged: ['name', 'status']}); // skip behavior for name and status properties.
instance.save({skipChanged: {name: true, status: true}}); // skip behavior for name and status properties.
```


TESTING
=============

Run the tests in `test.js`

```bash
  npm test
```

Run with debugging output on:

```bash
  DEBUG='loopback-ds-changed-mixin' npm test
```

Run the test with a mongodb datasource
```bash
  MONGODB_URL=mongodb://localhost/ds_changed_mixin npm test
```
