import { app } from './app.js';
import { config } from './config/index.js';
import { ensureDatabaseRunning, stopDatabaseIfEmbedded } from './config/dbRunner.js';
import { startSlaJob, stopSlaJob } from './jobs/slaMonitor.js';

async function bootstrap() {
  try {
    console.log('[Server] Checking PostgreSQL connectivity...');
    await ensureDatabaseRunning();

    const server = app.listen(config.port, () => {
      console.log(`================================================================`);
      console.log(` Regulatory Complaint Management Backend is RUNNING on port ${config.port}`);
      console.log(` Environment: ${config.env}`);
      console.log(` Health Endpoint: http://localhost:${config.port}/api/v1/health`);
      console.log(` Allowed Origin: ${config.clientUrl}`);
      console.log(`================================================================`);

      // Start SLA deadline and escalation monitoring
      startSlaJob();
    });

    const shutdown = async () => {
      console.log('\n[Server] Graceful shutdown initiated...');
      stopSlaJob();
      server.close(async () => {
        console.log('[Server] HTTP listener closed.');
        await stopDatabaseIfEmbedded();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('[Fatal Bootstrap Error]:', error);
    process.exit(1);
  }
}

bootstrap();
