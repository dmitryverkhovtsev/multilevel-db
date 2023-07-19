process.env.NODE_ENV = 'test'
var { spawn } = require('child_process')
var os = require('os')
var path = require('path')
var crypto = require('crypto')

var test = require('tape')
var async = require('async')

var client = require('../client')

test('should read and write to db when server connection is dropped', (t) => {
  var server = spawnServer()
  var db = client({ host: 'localhost', port: 9000, valueEncoding: 'json' }, 10)

  setTimeout(function () {
    async.series([
      cb => db.put('foo', 'bar', cb),
      cb => db.get('foo', (err, data) => {
        t.false(err)
        t.is(data, 'bar')
        cb()
      }),
      async.asyncify(() => server.kill()),
      cb => async.parallel([
        cb => async.times(10, (i, cb) =>
          async.series([
            cb => db.put('foo' + i, 'bar' + i, cb),
            cb => db.get('foo' + i, (err, data) => {
              t.error(err)
              t.is(data, 'bar' + i)
              cb()
            })
          ], cb)
        , cb),
        cb => setTimeout(() => {
          server = spawnServer()
          cb()
        }, 2000)
      ], cb)
    ], (err) => {
      server.kill()
      t.end(err)
    })
  }, 1000)
})

function spawnServer () {
  return spawn('node', ['./index.js'], {
    env: Object.assign({}, process.env, {
      DB: path.join(os.tmpdir(), crypto.randomBytes(16).toString('hex'))
    })
  })
}
