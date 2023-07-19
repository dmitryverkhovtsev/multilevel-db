process.env.NODE_ENV = 'test'
var { spawn } = require('child_process')
var os = require('os')
var path = require('path')
var crypto = require('crypto')

var test = require('tape')
var async = require('async')

var client = require('../client')

var consoleError = console.error
console.error = function (e) {
  if (e && e.message === 'connect ECONNREFUSED 127.0.0.1:9000') {
    return
  }
  consoleError(arguments)
}

test('should allow client without authKey connect to server without AUTH_KEY',
  function (t) {
    var server = spawnServer()
    setTimeout(function () {
      var db = client({ host: 'localhost', port: 9000, valueEncoding: 'json' }, 0)
      async.series([
        cb => db.put('foo', 'bar', cb),
        cb => db.get('foo', (err, data) => {
          t.false(err)
          t.is(data, 'bar')
          cb()
        })
      ], (err) => {
        server.kill()
        t.end(err)
      })
    }, 1000)
  })

test('should allow client with authKey=lincx connect to server without AUTH_KEY',
  function (t) {
    var server = spawnServer()
    setTimeout(function () {
      var db = client({ host: 'localhost', port: 9000, valueEncoding: 'json', authKey: 'lincx' }, 0)
      async.series([
        cb => db.put('foo', 'bar', cb),
        cb => db.get('foo', (err, data) => {
          t.false(err)
          t.is(data, 'bar')
          cb()
        })
      ], (err) => {
        server.kill()
        t.end(err)
      })
    }, 1000)
  })

test('should allow client with authKey="lincx" connect to server with AUTH_KEY="lincx"',
  function (t) {
    var server = spawnServer({ AUTH_KEY: 'lincx' })
    setTimeout(function () {
      var db = client({ host: 'localhost', port: 9000, valueEncoding: 'json', authKey: 'lincx' }, 0)
      async.series([
        cb => db.put('foo', 'bar', cb),
        cb => db.get('foo', (err, data) => {
          t.false(err)
          t.is(data, 'bar')
          cb()
        })
      ], (err) => {
        server.kill()
        t.end(err)
      })
    }, 1000)
  })

test('should not allow client with incorrect authKey="hello" connect to server with AUTH_KEY="lincx"',
  function (t) {
    var server = spawnServer({ AUTH_KEY: 'lincx' })
    setTimeout(function () {
      var db = client({
        host: 'localhost',
        port: 9000,
        valueEncoding: 'json',
        authKey: 'hello'
      }, 0)
      db.on('error', function (err) {
        t.is(err.message, 'AUTH_KEY is incorrect or missing')
        server.kill()
        t.end()
      })
      db.put('foo', 'bar', function () { })
    }, 1000)
  })

test('should reconnect when connection dropped to server',
 function (t) {
   var server = spawnServer()

   setTimeout(function () {
     var db = client({ host: 'localhost', port: 9000, valueEncoding: 'json' }, 10)
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

test('should reconnect client with auth when connection dropped to server without AUTH_KEY', function (t) {
  var server = spawnServer()

  setTimeout(function () {
    var db = client({host: 'localhost', port: 9000, valueEncoding: 'json', authKey: 'lincx'}, 10)
    async.series([
      cb => db.put('foo', 'bar', cb),
      cb => db.get('foo', (err, data) => {
        t.false(err)
        t.is(data, 'bar')
        cb()
      }),
      async.asyncify(() => server.kill()),
      cb => async.parallel([
        cb => async.times(3, (i, cb) =>
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
        }, 1500)
      ], cb)
    ], (err) => {
      server.kill()
      t.end(err)
    })
  }, 1000)
})

test('should reconnect client with authKey=lincx when connection dropped to server with AUTH_KEY=lincx', function (t) {
  var server = spawnServer({AUTH_KEY: 'lincx'})

  setTimeout(function () {
    var db = client({
      host: 'localhost',
      port: 9000,
      valueEncoding: 'json',
      authKey: 'lincx'
    }, 10)
    async.series([
      cb => db.put('foo', 'bar', cb),
      cb => db.get('foo', (err, data) => {
        t.false(err)
        t.is(data, 'bar')
        cb()
      }),
      async.asyncify(() => server.kill()),
      cb => async.parallel([
        cb => async.times(3, (i, cb) =>
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
          server = spawnServer({AUTH_KEY: 'lincx'})
          cb()
        }, 1500)
      ], cb)
    ], (err) => {
      server.kill()
      t.end(err)
    })
  }, 1000)
})

function spawnServer (env) {
  return spawn('node', ['./index.js'], {
    env: Object.assign(
      {},
      process.env,
      { DB: path.join(os.tmpdir(), crypto.randomBytes(16).toString('hex')) },
      env
    ),
    stdio: 'inherit'
  })
}
