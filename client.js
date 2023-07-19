var net = require('net')
var { Buffer } = require('buffer')
var { createHash } = require('crypto')

var multileveldown = require('multileveldown')
var through2 = require('through2')

module.exports = function (opts, reconnectAttempts = Infinity) {
  var db = multileveldown.client({
    retry: true,
    valueEncoding: opts.valueEncoding
  })

  function connect () {
    var sock = net.connect({host: opts.host, port: opts.port})

    sock.once('data', function (data) {
      if (data.toString() === 'ERROR: AUTH_KEY is incorrect or missing') {
        db.emit('error', new Error('AUTH_KEY is incorrect or missing'))
      }
    })
    sock.on('error', function (err) {
      sock.destroy()
      if (err) console.error(err)
    })

    sock.on('close', function () {
      reconnectAttempts--
      reconnectAttempts >= 0 && setTimeout(connect, 1000)
    })
    opts.authKey
      ? sock.pipe(db.connect()).pipe(sendAuthKey(opts.authKey)).pipe(sock)
      : sock.pipe(db.connect()).pipe(sock)
  }

  connect()

  return db
}

function sendAuthKey (authKey) {
  var isAuthSent
  return through2(function (chunk, enc, cb) {
    if (isAuthSent) return cb(null, chunk)

    isAuthSent = true
    return cb(null, Buffer.concat([
      Buffer.from('AUTH'),
      Buffer.from(createHash('sha256').update(authKey).digest('hex')),
      chunk
    ]))
  })
}
