var DB_NAME = process.env.DB_NAME || 'multilevel-db'
require('productionize')(DB_NAME)

var net = require('net')
var path = require('path')
var level = require('level')
var multileveldown = require('multileveldown')

var DB_CLOSED = process.env.DB_CLOSED === 'true'
var DB = process.env.DB || path.join(__dirname, 'db')
var db = level(DB)

var server = net.createServer(function (sock) {
  sock.on('error', function (err) {
    sock.destroy()
    if (err) return console.error(err)
  })

  if (!DB_CLOSED) {
    sock.pipe(multileveldown.server(db)).pipe(sock)
  }
})

var PORT = process.env.PORT || 9000
server.listen(PORT)
var version = require('./package.json').version
console.log('%s (v%s) listening on port %s', DB_NAME, version, PORT)
