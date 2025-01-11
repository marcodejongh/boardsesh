# Drizzle in Boardsesh

Writing this down because I will otherwise forget myself.
I had issues adopting Prisma, so I decided to try some other random ORM.
For no particular reason I ended up with Drizzle, which seems mostly okay.

I made the mistake of deleting some of the snapshots, so dont do that again.

To generate a new database migration follow these steps:

1. Modify the lib/db/schema.ts file with the changes you want
2. Run `npx drizzle-kit generate --name=$MigrationName$`
3. Edit the generated SQL file, and make sure you're happy with it
4. Run `npx drizzle-kit migrate` to exucute the migration
