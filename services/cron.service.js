'use strict';

const cron = require('node-cron');

let task = null;
let lastRunAt = null;
let lastRunResult = null;

function getTimeZone() {
  return process.env.CRON_TZ || 'Asia/Ho_Chi_Minh';
}

/**
 * Demo daily job (for challenge + swagger demo).
 * Replace body with real reminder/report logic if needed.
 */
async function runDailyJob(trigger = 'schedule') {
  const started = new Date();
  lastRunAt = started;

  lastRunResult = {
    trigger,
    startedAt: started.toISOString(),
    finishedAt: new Date().toISOString(),
    message: 'Daily cron executed (demo)'
  };

  // visible in server logs
  // eslint-disable-next-line no-console
  console.log('[cron] daily job executed:', lastRunResult);

  return lastRunResult;
}

function scheduleDailyJob() {
  if (task) return;

  // 07:00 every day
  task = cron.schedule(
    '0 7 * * *',
    () => {
      runDailyJob('schedule').catch((e) => {
        lastRunResult = { trigger: 'schedule', error: e.message, at: new Date().toISOString() };
        // eslint-disable-next-line no-console
        console.error('[cron] daily job failed:', e);
      });
    },
    { timezone: getTimeZone() }
  );

  task.start();
}

function getStatus() {
  return {
    enabled: Boolean(task),
    timezone: getTimeZone(),
    lastRunAt: lastRunAt ? lastRunAt.toISOString() : null,
    lastRunResult
  };
}

module.exports = { scheduleDailyJob, runDailyJob, getStatus };