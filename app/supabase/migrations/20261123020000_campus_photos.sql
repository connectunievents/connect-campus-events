-- Real campus photos (served from /public/campus) with the attribution their licenses require.
-- Safe to run more than once.

alter table public.universities add column if not exists cover_credit text;

update public.universities u set cover_url = v.url, cover_credit = v.credit
from (values
  ('aub', '/campus/aub.jpg', 'Photo: College Hall, AUB — marviikad, CC BY-SA 2.0, via Wikimedia Commons'),
  ('bau', '/campus/bau.jpg', 'Photo: BAU Beirut campus — CosmicAnatomy, CC BY-SA 4.0, via Wikimedia Commons'),
  ('lau', '/campus/lau.jpg', 'Photo: LAU''s original campus (Junior Girls'' College), c. 1930s — Matson Collection, Library of Congress, public domain')
) as v(slug, url, credit)
where u.slug = v.slug;

select slug, cover_url, cover_credit from public.universities order by slug;
