const SearchGdrive = require('./searchGdrive.schema')

const node = new SearchGdrive()
const fn = (RED) => node.config(RED)
module.exports = fn