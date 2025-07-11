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

## Development setup (using a dump)

I uploaded a database dump here: https://drive.google.com/file/d/1qdHEaCqdluhTCjjTdYD84SzfwTwaFI_S/view?usp=sharing.
But I havent gotten around to using it in the docker setup scripts, but is relatively easy to do.

1. Download the above database backup
2. In docker-compose.yml comment out all the entry point scripts
3. Start docker with `docker-compose up`
4. Now launch pgadmin, and connect to localhost:54320 user & password: postgres
5. Now create an empty database
6. right click empty database and select restore, restore database using the downloaded dump
