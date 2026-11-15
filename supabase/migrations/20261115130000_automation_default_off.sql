-- Scheduled automations are OFF until an admin activates them in Admin -> Automation.
-- Run in Supabase -> SQL Editor BEFORE deploying the code that makes the cron routes
-- callable (the schedules start running as soon as that deploy is live).
-- Idempotent. Only rules that have never run are switched off, so re-running it later
-- never turns off something an admin already activated and that has been running.

insert into automation_rules (code, name, description, trigger_type, trigger_config, action_type, action_config, is_active)
values (
  'check_viewing_reminders',
  'Viewing Reminders',
  'Email visitors a reminder before their booked property viewing.',
  'schedule',
  '{"cron": "0 9 * * *", "timezone": "Asia/Manila"}',
  'send_notification',
  '{}',
  false
)
on conflict (code) do nothing;

update automation_rules
   set is_active = false
 where last_run_at is null
   and code in (
     'generate_invoices', 'check_lease_expiry', 'generate_owner_soa',
     'check_viewing_reminders', 'check_ticket_slas', 'check_maintenance_due'
   );
