-- AI-assisted SEO for listings: the meta description search engines show in
-- results was, until now, auto-built at request time from title/location/
-- status/area (see generateMetadata in app/(marketing)/listings/[id]/page.tsx)
-- with nothing stored or curated. This adds an optional curated description;
-- listings without one keep falling back to the auto-built sentence.
alter table listings add column if not exists seo_description text;
