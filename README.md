# multilevel-db

Simple app to expose `leveldb` via `multileveldown`

## Environment Variables

* `DB_NAME=multilevel-db` used for logging
* `DB=./db` location of leveldb database files
* `PORT=9000` tcp port for multileveldown to listen on
* `DB_CLOSED=false` if the db should be closed (useful in very specific circumstances)
* `AUTH_KEY` used to authorize clients
