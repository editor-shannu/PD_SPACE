import cron from 'node-cron';
import { checkAllMissedFollowups } from '@/lib/alertEngine';

let isCronStarted = false;

/**
 * Initializes the node-cron daily schedule for checking missed follow-up dates.
 */
export function initCronJobs(): void {
  if (isCronStarted) {
    return;
  }
  isCronStarted = true;

  // Run daily at 00:00 (midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron Service] Running daily missed follow-up audit...');
    try {
      await checkAllMissedFollowups();
      console.log('[Cron Service] Daily missed follow-up audit completed.');
    } catch (err) {
      console.error('[Cron Service] Failed daily missed follow-up audit:', err);
    }
  });

  console.log('[Cron Service] Daily missed follow-up cron scheduled (0 0 * * *).');
}
