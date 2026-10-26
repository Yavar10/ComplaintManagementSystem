import EmbeddedPostgres from 'embedded-postgres';
import net from 'net';
import path from 'path';

let embeddedInstance: EmbeddedPostgres | null = null;

export async function isPortInUse(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

export async function ensureDatabaseRunning(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || '';
  const isRemote =
    process.env.NODE_ENV === 'production' ||
    dbUrl.includes('.supabase.co') ||
    dbUrl.includes('.neon.tech') ||
    dbUrl.includes('rds.amazonaws.com') ||
    dbUrl.includes('.render.com') ||
    dbUrl.includes('.railway.app') ||
    (dbUrl.length > 0 && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1'));

  if (isRemote) {
    console.log('[Database] Remote/Production database configured. Connecting directly via Prisma.');
    return;
  }

  const isRunning = await isPortInUse(5432);
  if (isRunning) {
    console.log('[Database] PostgreSQL instance detected running on port 5432.');
    return;
  }

  console.log('[Database] No PostgreSQL detected on port 5432. Launching embedded PostgreSQL server...');
  const dbDir = path.resolve(process.cwd(), '.pgdata');
  embeddedInstance = new EmbeddedPostgres({
    port: 5432,
    databaseDir: dbDir,
    user: 'postgres',
    password: 'password',
    persistent: true,
  });

  try {
    await embeddedInstance.initialise();
  } catch (err: any) {
    // Already initialised data directory
  }

  await embeddedInstance.start();
  console.log('[Database] Embedded PostgreSQL server started successfully.');

  try {
    await embeddedInstance.createDatabase('inno_complaints');
    console.log('[Database] inno_complaints database ready.');
  } catch (err: any) {
    // Database already exists
  }
}

export async function stopDatabaseIfEmbedded(): Promise<void> {
  if (embeddedInstance) {
    console.log('[Database] Stopping embedded PostgreSQL server...');
    await embeddedInstance.stop();
    embeddedInstance = null;
  }
}
