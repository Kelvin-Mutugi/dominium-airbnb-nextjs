import nextWorker from './.open-next/worker.js';
import { createClient } from '@supabase/supabase-js';

const worker = {
  fetch: nextWorker.fetch,
  scheduled(event, env, context) {
    context.waitUntil((async () => {
      const supabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      const job = event.cron === '0 0 * * *'
        ? { name: 'checkout completion', rpc: 'complete_due_host_bookings', args: { p_grace_hours: 24 } }
        : event.cron === '*/5 * * * *'
          ? { name: 'date-change decisions', rpc: 'auto_decide_due_date_change_requests', args: undefined }
          : null;

      if (!job) {
        console.warn('Ignoring unrecognized Cloudflare cron schedule:', event.cron);
        return;
      }

      const { data, error } = await supabase.rpc(job.rpc, job.args);
      if (error) {
        console.error(`Scheduled ${job.name} failed:`, error);
        return;
      }
      console.info(`Scheduled ${job.name} completed:`, data);
    })());
  },
};

export default worker;