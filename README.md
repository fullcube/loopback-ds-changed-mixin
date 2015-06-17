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

```
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
        "status": "String"
    },
    "mixins": {
        "Changed": {
            "callback": "someFunction",
            "properties": {
                "status": true
            }
        }
    }
}
```

In the above, if the status property is modified on one of more model instances
the function `someFunction` will be executed with a list of the Ids of the
instances that were changed.

OPTIONS
=============

The specific fields that are to be marked as changed can be set by passing an
object to the mixin options.

In this example we mark the `status` fields for change notifications.

```json
{
    "name": "Widget",
    "properties": {
        "name": "String",
        "status": "String",
        "role": "String"
    },
    "mixins": {
        "Changed": {
            "callback": "someFunction",
            "properties": {
                "status": true
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