var DB_NAME = process.env.DB_NAME || 'multilevel-db'
require('productionize')(DB_NAME)

var net = require('net')
var path = require('path')
var { createHash } = require('crypto')
var { Buffer } = require('buffer')

var level = require('level')
var multileveldown = require('multileveldown')
var through2 = require('through2')

var DB_CLOSED = process.env.DB_CLOSED === 'true'
var DB = process.env.DB || path.join(__dirname, 'db')
var AUTH_KEY = process.env.AUTH_KEY || ''
var authKeyHash = createHash('sha256').update(AUTH_KEY).digest('hex')

var db = DB_CLOSED ? {} : level(DB)

var server = net.createServer(function (sock) {
  sock.on('error', function (err) {
    sock.destroy()
    if (err) return console.error(err)
    process.exit(1)
  })

  if (!DB_CLOSED) {
    var mldb = multileveldown.server(db)
    return sock.pipe(checkAuthKey(sock)).pipe(mldb).pipe(sock)
  }
})

var PORT = process.env.PORT || 9000
server.listen(PORT)
var version = require('./package.json').version
console.log('%s (v%s) listening on port %s', DB_NAME, version, PORT)

function checkAuthKey (sock) {
  var serverAuthKeyLength = Buffer.from(AUTH_KEY).length
  var authorized
  return through2(function (chunk, enc, cb) {
    if (authorized) return cb(null, chunk)

    var data = chunk
    var isAuthPrefixed = chunk.slice(0, 4).toString() === 'AUTH'
    if (isAuthPrefixed) {
      var clientAuthKeyHash = chunk.slice(4, 4 + authKeyHash.length).toString()
      if (clientAuthKeyHash === authKeyHash) {
        authorized = true
      }
      data = chunk.slice(4 + authKeyHash.length)
    }

    if (serverAuthKeyLength > 0 && !authorized) {
      sock.write('ERROR: AUTH_KEY is incorrect or missing')
      sock.destroy()
      return cb()
    }

    cb(null, data)
  })
}

