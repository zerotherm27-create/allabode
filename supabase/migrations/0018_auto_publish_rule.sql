-- Add auto-publish automation rule (OFF by default — staff publish manually)
INSERT INTO automation_rules (name, rule_key, description, enabled, config)
VALUES (
  'Auto-publish approved SOAs',
  'auto_publish_owner_soa',
  'Automatically publish owner SOAs that were AI-approved on Day 1, on Day 2 at 02:00 (Asia/Manila). When OFF, staff must click "Publish & Send to Owner" manually from /admin/statements.',
  false,
  '{}'
)
ON CONFLICT (rule_key) DO NOTHING;
