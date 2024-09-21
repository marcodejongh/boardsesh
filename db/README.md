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
First install the required dependencies:

```
brew install postgres pgloader 
python3 -m pip install boardlib
```

To setup a development database, make sure you have `postgres` started locally.
On MacOs this can be done using brew:

```
brew services start postgresql 
```

In  db/ To create the databases then run:

```
 DATABASE_URL="postgresql://$(whoami):@localhost:5432/boardsesh" ./setup-development-db.sh 
 ```

 