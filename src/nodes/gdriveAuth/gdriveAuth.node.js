const GdriveAuth = require('./gdriveAuth.schema')

const node = new GdriveAuth()
const fn = (RED) => node.config(RED)
module.exports = fn