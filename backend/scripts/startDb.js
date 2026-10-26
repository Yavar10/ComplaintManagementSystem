const EmbeddedPostgres = require('embedded-postgres').default;
const path = require('path');

const dbDir = path.resolve(__dirname, '..', '.pgdata');
const ep = new EmbeddedPostgres({
  port: 5432,
  databaseDir: dbDir,
  user: 'postgres',
  password: 'password',
  persistent: true,
});

(async () => {
  try {
    await ep.initialise();
  } catch (e) {}
  await ep.start();
  console.log('[PG-DAEMON] PostgreSQL running on port 5432.');
  try {
    await ep.createDatabase('inno_complaints');
  } catch (e) {}

  // Keep alive
  process.on('SIGINT', async () => {
    console.log('Shutting down PostgreSQL...');
    await ep.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    console.log('Shutting down PostgreSQL...');
    await ep.stop();
    process.exit(0);
  });
})();
