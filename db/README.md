# DB Setup

Boardsesh uses [Boardlib](https://github.com/lemeryfertitta/BoardLib) for downloading the databases.
They are then stored in postgres, but the tablenames are prefixed with the boardname, i.e:
kilter_climbs
kilter_climbstats
tension_climbs
tension_climbstats
etc...

At some point it would be good to add support to Boardlib for syncing the postgres database.
But for now, we just drop everything and recreated it.

## Development setup

Run docker to startup the development database:

```
docker-compose up
```

This starts up a docker container that uses Boardlib to download the databases and then loads them into postgres with an db update script and pgloader.

```
 DATABASE_URL="postgresql://$(whoami):@localhost:5432/boardsesh" ./setup-development-db.sh
```
