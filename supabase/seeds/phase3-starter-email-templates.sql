-- Starter follow-up email templates (Phase 3).
--
-- Run AFTER supabase/migrations/20261022100000_leads_and_nurture.sql.
-- Safe to re-run: existing templates (matched on template_key) are left
-- untouched, so edits made in /admin/follow-ups are never overwritten.
--
-- audience 'lead'       = sent to the customer who enquired.
-- audience 'specialist' = internal reminder to the property specialist.
-- Merge fields are plain double-curly placeholders; blank values simply vanish.
-- Nothing is sent until NURTURE_ENABLED=true is set (NURTURE_DRY_RUN=true to rehearse).

insert into public.email_templates
  (template_key, name, subject, body, delay_days, position, audience, is_active)
values
(
  'day-0-thanks',
  'Day 0 - Thanks for your enquiry',
  $s$Thanks for getting in touch, {{lead_first_name}}$s$,
  $b$Hi {{lead_first_name}},

Thank you for your enquiry through All Abode Property Solutions. I'm {{specialist_name}}, your property specialist, and I'll be looking after you from here.

I'll review what you're after and get back to you personally. If it helps, you can reply to this email with your preferred budget, location and move-in timeline, and I'll start from there.

{{personal_note}}

Warm regards,
{{specialist_name}}
Property specialist, {{company_name}}
{{specialist_phone}}$b$,
  0, 10, 'lead', true
),
(
  'day-1-specialist-reminder',
  'Day 1 - Reminder to contact new lead',
  $s$Reminder: {{lead_name}} is still marked New$s$,
  $b$Hi {{specialist_first_name}},

A friendly reminder that {{lead_name}} enquired yesterday and is still marked New in your dashboard. A quick personal reply within the first day makes a real difference.

Contact: {{lead_email}} {{lead_phone}}

Open the lead and update the stage once you have been in touch:
{{lead_url}}

This reminder stops on its own as soon as you move the lead out of New.$b$,
  1, 20, 'specialist', true
),
(
  'day-3-viewing-offer',
  'Day 3 - Offer a viewing',
  $s$Would you like to see a place in person, {{lead_first_name}}?$s$,
  $b$Hi {{lead_first_name}},

It's {{specialist_name}} again. Photos only tell part of the story, so I'd be glad to arrange a viewing at a time that suits you, whether that's a weekday after work or a weekend.

Just reply with a day or two that could work and the area you prefer, and I'll line up the options and confirm the details with you.

{{personal_note}}

Kind regards,
{{specialist_name}}
Property specialist, {{company_name}}
{{specialist_phone}}$b$,
  3, 30, 'lead', true
),
(
  'day-7-more-properties',
  'Day 7 - More properties to consider',
  $s$A few more options for you, {{lead_first_name}}$s$,
  $b$Hi {{lead_first_name}},

If the first property wasn't quite right, there may be others that fit better. Our current listings are here:
{{site_url}}/listings

If you tell me what you'd change, such as the budget, the neighbourhood or the number of bedrooms, I can shortlist places that match and leave the rest out.

{{personal_note}}

Kind regards,
{{specialist_name}}
Property specialist, {{company_name}}
{{specialist_phone}}$b$,
  7, 40, 'lead', true
),
(
  'day-14-check-in',
  'Day 14 - Checking in',
  $s$Still looking, {{lead_first_name}}?$s$,
  $b$Hi {{lead_first_name}},

I wanted to check in and see how your search is going. If you've already found a place, congratulations, and no need to reply. If you're still looking, I'm happy to pick up where we left off.

There's no pressure either way. You can reach me any time by replying to this email.

{{personal_note}}

Warm regards,
{{specialist_name}}
Property specialist, {{company_name}}
{{specialist_phone}}$b$,
  14, 50, 'lead', true
)
on conflict (template_key) do nothing;
