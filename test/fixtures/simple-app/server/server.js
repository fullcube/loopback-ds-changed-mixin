/* eslint no-console: 0 */

const loopback = require('loopback')
const boot = require('loopback-boot')

const app = loopback()

app.use('/api', loopback.rest())

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started')
    console.log('Web server listening at: %s', app.get('url'))
  })
}

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) {
    throw err
  }

  // start the server if `$ node server.js`
  if (require.main === module) {
    app.start()
  }
})

module.exports = app
