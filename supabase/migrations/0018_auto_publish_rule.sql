-- Add auto-publish automation rule (OFF by default — staff publish manually)
INSERT INTO automation_rules (code, name, description, trigger_type, trigger_config, action_type, action_config, is_active)
VALUES (
  'auto_publish_owner_soa',
  'Auto-publish approved SOAs',
  'Automatically publish owner SOAs that were AI-approved on Day 1, on Day 2 at 02:00 (Asia/Manila). When OFF, staff must click "Publish & Send to Owner" manually from /admin/statements.',
  'schedule',
  '{"cron": "0 2 2 * *", "timezone": "Asia/Manila"}',
  'generate_soa',
  '{}',
  false
)
ON CONFLICT (code) DO NOTHING;
