/**
 * npm run db:setup   – migrate the database in DATABASE_URL and seed the catalogue if empty.
 * Without DATABASE_URL it prepares the local PGlite database in .data/pglite.
 */
import { db } from '../src/lib/db';

const started = Date.now();
db()
  .then(() => {
    console.log(`Database ready (${process.env.DATABASE_URL ? 'Postgres' : 'local PGlite'}) in ${Date.now() - started} ms`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
