-- Demo data: universities, events, ticket types, a platform sponsor.
-- Safe to run more than once.

insert into public.universities (slug, name, short_name, city, country, email_domains, brand_color, website_url, logo_url, cover_url) values
 ('lau',  'Lebanese American University',      'LAU',  'Beirut / Byblos', 'Lebanon', '{lau.edu.lb,lau.edu}', '#006A4E', 'https://www.lau.edu.lb', null, 'https://images.unsplash.com/photo-1562774053-701939374585?w=1600&q=70'),
 ('aub',  'American University of Beirut',     'AUB',  'Beirut',          'Lebanon', '{aub.edu.lb,mail.aub.edu}', '#840132', 'https://www.aub.edu.lb', null, 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&q=70'),
 ('usj',  'Université Saint-Joseph',           'USJ',  'Beirut',          'Lebanon', '{usj.edu.lb,net.usj.edu.lb}', '#00377B', 'https://www.usj.edu.lb', null, 'https://images.unsplash.com/photo-1562774053-701939374585?w=1600&q=70'),
 ('ndu',  'Notre Dame University – Louaize',   'NDU',  'Zouk Mosbeh',     'Lebanon', '{ndu.edu.lb}', '#00205B', 'https://www.ndu.edu.lb', null, 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=1600&q=70'),
 ('liu',  'Lebanese International University','LIU',  'Beirut',          'Lebanon', '{liu.edu.lb,students.liu.edu.lb}', '#0D4C92', 'https://liu.edu.lb', null, 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=1600&q=70'),
 ('bau',  'Beirut Arab University',            'BAU',  'Beirut',          'Lebanon', '{bau.edu.lb,student.bau.edu.lb}', '#1F3A93', 'https://www.bau.edu.lb', null, 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=1600&q=70'),
 ('ua',   'Université Antonine',               'UA',   'Baabda',          'Lebanon', '{ua.edu.lb}', '#7A1F2B', 'https://www.ua.edu.lb', null, 'https://images.unsplash.com/photo-1574958269340-fa927503f3dd?w=1600&q=70'),
 ('lu',   'Lebanese University',               'LU',   'Hadath',          'Lebanon', '{ul.edu.lb}', '#2E7D32', 'https://www.ul.edu.lb', null, 'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=1600&q=70')
on conflict (slug) do nothing;

-- Demo events relative to "now" so the feed always has live + upcoming items.
with u as (select id, slug from public.universities)
insert into public.events (id, university_id, title, summary, description, category, venue, campus, starts_at, ends_at, cover_url, visibility, status)
select * from (values
 ('11111111-0000-0000-0000-000000000001'::uuid, (select id from u where slug='lau'), 'Spring Tech Career Fair',
  '60+ companies hiring interns and grads.', 'Bring your CV. Meet recruiters from top tech, banking and consulting firms. Free coffee all day.',
  'career', 'Irwin Hall', 'Beirut', now() - interval '1 hour', now() + interval '5 hours',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&q=70', 'public'::public.event_visibility, 'published'::public.event_status),
 ('11111111-0000-0000-0000-000000000002'::uuid, (select id from u where slug='lau'), 'Hackathon: Build for Beirut',
  '24 hours. 5 tracks. $5,000 in prizes.', 'Teams of up to 4 build solutions for the city. Meals, mentors and swag included.',
  'tech', 'Engineering Building', 'Byblos', now() + interval '3 days', now() + interval '4 days',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1600&q=70', 'students', 'published'),
 ('11111111-0000-0000-0000-000000000003'::uuid, (select id from u where slug='aub'), 'Outdoors Music Night',
  'Live bands on the Green Oval.', 'Student bands, food trucks and a headline act under the stars.',
  'music', 'Green Oval', 'Main Campus', now() + interval '2 days', now() + interval '2 days 4 hours',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1600&q=70', 'public', 'published'),
 ('11111111-0000-0000-0000-000000000004'::uuid, (select id from u where slug='aub'), 'AI in Medicine Symposium',
  'Researchers and clinicians on the future of care.', 'Keynotes, panels and a poster session.',
  'academic', 'Assembly Hall', 'Main Campus', now() + interval '6 days', now() + interval '6 days 6 hours',
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1600&q=70', 'public', 'published'),
 ('11111111-0000-0000-0000-000000000005'::uuid, (select id from u where slug='usj'), 'Gala de fin d''année',
  'Black-tie evening for the graduating class.', 'Dinner, DJ and awards.',
  'social', 'Campus des sciences sociales', 'Huvelin', now() + interval '12 days', now() + interval '12 days 5 hours',
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1600&q=70', 'public', 'published'),
 ('11111111-0000-0000-0000-000000000006'::uuid, (select id from u where slug='ndu'), 'Inter-University Basketball Final',
  'NDU vs LAU — the rematch.', 'Doors open 1 hour before tip-off.',
  'sports', 'Sports Complex', 'Zouk Mosbeh', now() + interval '1 day', now() + interval '1 day 3 hours',
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1600&q=70', 'public', 'published')
) as v(id, university_id, title, summary, description, category, venue, campus, starts_at, ends_at, cover_url, visibility, status)
on conflict (id) do nothing;

insert into public.ticket_types (event_id, name, description, price_cents, quantity, max_per_order, students_only, sort_order)
select e.id, t.name, t.descr, t.price, t.qty, t.maxq, t.students_only, t.sort
from public.events e
join (values
  ('11111111-0000-0000-0000-000000000001'::uuid, 'General admission', 'Free entry', 0, 800, 1, false, 0),
  ('11111111-0000-0000-0000-000000000002'::uuid, 'Hacker pass', 'Meals + swag included', 0, 200, 1, true, 0),
  ('11111111-0000-0000-0000-000000000003'::uuid, 'Student', 'Valid university ID at the gate', 1000, 400, 4, true, 0),
  ('11111111-0000-0000-0000-000000000003'::uuid, 'General', null, 2000, 300, 4, false, 1),
  ('11111111-0000-0000-0000-000000000004'::uuid, 'Attendee', null, 0, 500, 2, false, 0),
  ('11111111-0000-0000-0000-000000000005'::uuid, 'Gala seat', 'Dinner included', 6000, 250, 2, false, 0),
  ('11111111-0000-0000-0000-000000000006'::uuid, 'Bleachers', null, 500, 900, 6, false, 0),
  ('11111111-0000-0000-0000-000000000006'::uuid, 'Courtside', 'Front two rows', 2500, 40, 2, false, 1)
) as t(event_id, name, descr, price, qty, maxq, students_only, sort) on t.event_id = e.id
where not exists (select 1 from public.ticket_types x where x.event_id = e.id);
