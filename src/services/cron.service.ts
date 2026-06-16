// src/services/cron.service.ts
import cron, { ScheduledTask } from 'node-cron';

interface CronJobResult {
  trigger: string;
  startedAt: string;
  finishedAt: string;
  message: string;
  error?: string;
  at?: string;
}

let task: ScheduledTask | null = null;
let lastRunAt: Date | null = null;
let lastRunResult: CronJobResult | null = null;

function getTimeZone(): string {
  return process.env.CRON_TZ || 'Asia/Ho_Chi_Minh';
}

export async function runDailyJob(trigger = 'schedule'): Promise<CronJobResult> {
  const started = new Date();
  lastRunAt = started;

  lastRunResult = {
    trigger,
    startedAt: started.toISOString(),
    finishedAt: new Date().toISOString(),
    message: 'Daily cron executed (demo)'
  };

  console.log('[cron] daily job executed:', lastRunResult);
  return lastRunResult;
}

export function scheduleDailyJob(): void {
  if (task) return;

  task = cron.schedule(
    '0 7 * * *',
    () => {
      runDailyJob('schedule').catch((e: Error) => {
        lastRunResult = {
          trigger: 'schedule',
          error: e.message,
          at: new Date().toISOString(),
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          message: 'Failed'
        };
        console.error('[cron] daily job failed:', e);
      });
    },
    { timezone: getTimeZone() }
  );

  task.start();
}

export function getStatus() {
  return {
    enabled: Boolean(task),
    timezone: getTimeZone(),
    lastRunAt: lastRunAt ? lastRunAt.toISOString() : null,
    lastRunResult
  };
}