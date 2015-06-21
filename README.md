CHANGED
=============

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

SERVER.JS
=============

In your `server/server.js` file add the following line before the
`boot(app, __dirname);` line.

```javascript
...
var app = module.exports = loopback();
...
// Add Readonly Mixin to loopback
require('loopback-ds-changed-mixin')(app);

boot(app, __dirname, function(err) {
  'use strict';
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
```

CONFIG
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