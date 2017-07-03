/* eslint no-process-env: 0 */

'use strict'

const datasources = {}
const { MONGODB_URL } = process.env

if (MONGODB_URL) {
  datasources.db = {
    name: 'db',
    connector: 'loopback-connector-mongodb',
    url: MONGODB_URL,
  }
}

module.exports = datasources
