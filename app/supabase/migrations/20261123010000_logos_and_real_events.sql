-- Logos, event provenance, and real campus events (Nov–Dec 2026).
-- Real events were collected on 2026-11-23 from official university pages:
--   LAU: https://eventscal.lau.edu.lb/   USJ: https://usj.edu.lb/en   AUB (Beirut Chants): https://beirutchants.com/
-- Those pages list dates but not start times, so times below are placeholders and time_tbc = true.
-- Safe to run more than once.

alter table public.events add column if not exists source_url text;
alter table public.events add column if not exists time_tbc boolean not null default false;
alter table public.events add column if not exists is_demo boolean not null default false;

-- Logos are served by the app from /public/logos.
update public.universities set logo_url = '/logos/' || slug || '.png'
where slug in ('lau','aub','usj','ndu','liu','bau','ua','lu') and (logo_url is null or logo_url like '/logos/%');

-- The original seed events are samples.
update public.events set is_demo = true where id::text like '11111111-%';

-- ---------- Real events ---------------------------------------------------
-- Beirut is UTC+2 in winter.
with u as (select id, slug from public.universities),
v(id, slug, title, summary, category, venue, campus, starts_at, ends_at, cover, src) as (values
 -- LAU
 ('22222222-0000-0000-0000-000000000001'::uuid, 'lau', 'Beyond the Scores: Lebanon in PISA 2025', 'Seminar on what Lebanon''s PISA 2025 results mean for education.', 'academic', 'Chafica Balaa Lecture Hall 403, Gezairi Building', 'Beirut', '2026-11-24 11:00+02'::timestamptz, '2026-11-24 13:00+02'::timestamptz, 'photo-1576091160550-2173dba999ef', '/event.php?evt=20261106_beyond-the-scores-lebanon-in-pis'),
 ('22222222-0000-0000-0000-000000000002'::uuid, 'lau', 'LAU Music Nights: Classical Trio', 'An evening of chamber music with a classical trio.', 'music', 'Irwin Hall Auditorium', 'Beirut', '2026-11-24 19:00+02', '2026-11-24 21:00+02', 'photo-1501386761578-eac5c94b800a', '/event.php?evt=20261101_lau-music-night-piano-trio'),
 ('22222222-0000-0000-0000-000000000003'::uuid, 'lau', 'The 4th Lebanon Water Forum 2026', 'A forum on Lebanon''s water sector.', 'academic', 'Adelaide Bahu (Vincenti) Lecture Hall, Room 903, AKSOB', 'Beirut', '2026-11-24 09:00+02', '2026-11-24 15:00+02', 'photo-1576091160550-2173dba999ef', '/event.php?evt=20261105_the-4th-lebanon-water-forum-2026'),
 ('22222222-0000-0000-0000-000000000004'::uuid, 'lau', 'A Very Merry Gathering: Christmas Market & Tree Lighting', 'Christmas market and tree-lighting celebration on campus.', 'social', 'Beirut campus', 'Beirut', '2026-11-25 16:00+02', '2026-11-25 21:00+02', 'photo-1511795409834-ef04bbd61622', '/event.php?evt=20261112_a-very-merry-gathering-christmas'),
 ('22222222-0000-0000-0000-000000000005'::uuid, 'lau', 'Assertive Communication and Healthy Boundaries at Work', 'Online webinar on workplace communication.', 'career', 'Online (Webex)', 'Online', '2026-11-25 17:00+02', '2026-11-25 18:30+02', 'photo-1540575467063-178a50c2df87', '/event.php?evt=20261118_assertive-communication-and-heal'),
 ('22222222-0000-0000-0000-000000000006'::uuid, 'lau', 'Coffee with POLIS: Where Alumni and Students Connect', 'Networking meetup for POLIS alumni and students.', 'social', 'Nicol Hall 406', 'Beirut', '2026-11-25 12:00+02', '2026-11-25 14:00+02', 'photo-1511795409834-ef04bbd61622', '/event.php?evt=20261117_coffee-with-polis-where-alumni-a'),
 ('22222222-0000-0000-0000-000000000007'::uuid, 'lau', 'VIP+ Introduction Session', 'Introductory session for the VIP+ program.', 'tech', 'Chafica Balaa Lecture Hall 403, Gezairi Building', 'Beirut', '2026-11-25 11:00+02', '2026-11-25 12:30+02', 'photo-1504384308090-c894fdcc538d', '/event.php?evt=20261111_vip-introduction-session'),
 ('22222222-0000-0000-0000-000000000008'::uuid, 'lau', 'AI-Powered Resume Masterclass', 'Online masterclass on building a resume with AI tools.', 'career', 'Online', 'Online', '2026-11-26 17:00+02', '2026-11-26 18:30+02', 'photo-1540575467063-178a50c2df87', '/event.php?evt=20261027_ai-powered-resume-masterclass'),
 ('22222222-0000-0000-0000-000000000009'::uuid, 'lau', 'VIP+ Poster Presentations', 'Poster session for the VIP+ program.', 'tech', 'Frem Civic Center Multipurpose Hall', 'Byblos', '2026-11-26 11:00+02', '2026-11-26 14:00+02', 'photo-1504384308090-c894fdcc538d', '/event.php?evt=20261111_vip-poster-presentations'),
 ('22222222-0000-0000-0000-000000000010'::uuid, 'lau', 'Physics-Informed Neural Methods for Shallow-Water Flow', 'Research seminar on a shock-capturing neural method for shallow-water flow with topography.', 'academic', 'Dr. Najla W. Atiyah Conference Room 1301 (and Webex)', 'Beirut', '2026-11-27 12:00+02', '2026-11-27 13:30+02', 'photo-1576091160550-2173dba999ef', '/event.php?evt=20261116_a-well-balanced-shock-capturing-'),
 ('22222222-0000-0000-0000-000000000011'::uuid, 'lau', 'Wasted Food, Rising Resistance', 'Webinar on why food loss and waste matter for antimicrobial resistance.', 'academic', 'Online (Google Meet)', 'Online', '2026-11-27 17:00+02', '2026-11-27 18:30+02', 'photo-1576091160550-2173dba999ef', '/event.php?evt=20261117_wasted-food-rising-resistance-wh'),
 ('22222222-0000-0000-0000-000000000012'::uuid, 'lau', 'AI & IoT Fusion: Smart Systems Hands-on Experience', 'Hands-on smart-systems bootcamp.', 'tech', 'Block A 402 Lab', 'Byblos', '2026-11-28 10:00+02', '2026-11-28 15:00+02', 'photo-1504384308090-c894fdcc538d', '/event.php?evt=20261105_ai-iot-fusion-the-smart-systems-'),
 ('22222222-0000-0000-0000-000000000013'::uuid, 'lau', 'Christmas Melodies From Across The Globe', 'Christmas music concert.', 'music', 'Irwin Hall Auditorium', 'Beirut', '2026-12-01 19:00+02', '2026-12-01 21:00+02', 'photo-1501386761578-eac5c94b800a', '/event.php?evt=20261015_christmas-carols-from-across-the-1'),
 ('22222222-0000-0000-0000-000000000014'::uuid, 'lau', 'VIP+ Final Presentations', 'Final juried presentations for the VIP+ program.', 'tech', 'Dunia & Naji Boulos Lecture Hall 402, Science Building', 'Byblos', '2026-12-01 10:00+02', '2026-12-02 16:00+02', 'photo-1504384308090-c894fdcc538d', '/event.php?evt=20261201_vip-final-presentations'),
 ('22222222-0000-0000-0000-000000000015'::uuid, 'lau', 'Under the Christmas Stars: A Christmas Concert', 'Christmas concert by the LAU choir.', 'music', 'Gulbenkian Amphitheater', 'Beirut', '2026-12-03 19:00+02', '2026-12-03 21:00+02', 'photo-1501386761578-eac5c94b800a', '/event.php?evt=20260821_lau-choir-christmas-concert'),
 ('22222222-0000-0000-0000-000000000016'::uuid, 'lau', 'LAU NextGen Entrepreneurship Day', 'Youth innovation and entrepreneurship challenge.', 'career', 'AKSOB Building, Room 903', 'Beirut', '2026-12-05 10:00+02', '2026-12-05 15:00+02', 'photo-1540575467063-178a50c2df87', '/event.php?evt=20261119_lau-nextgen-entrepreneurship-day'),
 ('22222222-0000-0000-0000-000000000017'::uuid, 'lau', 'Ceremony: Marie El-Khazen''s "Two Women Dressed Up as Men"', 'Ceremony celebrating the donation of an artwork.', 'arts', 'Riyad Nassar Library Lobby', 'Beirut', '2026-12-07 12:00+02', '2026-12-07 13:30+02', 'photo-1562774053-701939374585', '/event.php?evt=20261102_ceremony-celebrating-a-donation-'),
 ('22222222-0000-0000-0000-000000000018'::uuid, 'lau', 'LAU Engine Invest Day', 'Startups pitch to investors.', 'career', 'Gulbenkian Amphitheater, Safadi Fine Arts Building', 'Beirut', '2026-12-10 10:00+02', '2026-12-10 15:00+02', 'photo-1540575467063-178a50c2df87', '/event.php?evt=20261102_lau-engine-invest-day'),
 ('22222222-0000-0000-0000-000000000019'::uuid, 'lau', 'Beirut Chants: Tribute to Dalida', 'Beirut Chants festival concert: a tribute to Dalida.', 'music', 'Gulbenkian Amphitheater', 'Beirut', '2026-12-12 20:00+02', '2026-12-12 22:00+02', 'photo-1501386761578-eac5c94b800a', '/event.php?evt=20261202_beirut-chants-tribute-to-dalida'),
 ('22222222-0000-0000-0000-000000000020'::uuid, 'lau', 'Bridging Worlds: Art, Data & Technology', 'Rami Saab presents the archive of Afaf Zurayk.', 'arts', 'Chafica Balaa Auditorium, Room 403, Gezairi Building', 'Beirut', '2026-12-17 18:00+02', '2026-12-17 19:30+02', 'photo-1562774053-701939374585', '/event.php?evt=20261104_bridging-worlds-art-data-technol'),
 ('22222222-0000-0000-0000-000000000021'::uuid, 'lau', 'Beirut Chants: El Sistema', 'Beirut Chants festival concert.', 'music', 'Irwin Hall Auditorium', 'Beirut', '2026-12-20 20:00+02', '2026-12-20 22:00+02', 'photo-1501386761578-eac5c94b800a', '/event.php?evt=20261203_beirut-chants-el-sistema'),
 ('22222222-0000-0000-0000-000000000022'::uuid, 'lau', 'Christmas Fiesta: Christmas Village & Ghinwa Live', 'Christmas village and live performance for a good cause.', 'social', 'Beirut campus', 'Beirut', '2026-12-23 16:00+02', '2026-12-23 22:00+02', 'photo-1511795409834-ef04bbd61622', '/event.php?evt=20261201_christmas-fiesta-christmas-villa'),
 -- USJ
 ('22222222-0000-0000-0000-000000000101'::uuid, 'usj', 'Symposium: 14th Arab Report on Cultural Development', 'Arab Thought Foundation and USJ symposium.', 'academic', 'USJ', 'Beirut', '2026-11-25 10:00+02', '2026-11-25 16:00+02', 'photo-1562774053-701939374585', 'https://usj.edu.lb/en/upcoming_events/atf-and-usj-host-symposium-14th-arab-report-cultural-development'),
 ('22222222-0000-0000-0000-000000000102'::uuid, 'usj', 'ISO Research Day', 'Research day at USJ.', 'academic', 'USJ', 'Beirut', '2026-11-28 09:00+02', '2026-11-28 15:00+02', 'photo-1576091160550-2173dba999ef', 'https://usj.edu.lb/en/upcoming_events/iso-research-day'),
 ('22222222-0000-0000-0000-000000000103'::uuid, 'usj', 'Crisis Management for Executives', 'Executive education session on crisis management.', 'career', 'USJ', 'Beirut', '2026-12-11 09:00+02', '2026-12-11 16:00+02', 'photo-1540575467063-178a50c2df87', 'https://usj.edu.lb/en/upcoming_events/crisis-management-executives'),
 -- AUB (Beirut Chants festival concerts at AUB)
 ('22222222-0000-0000-0000-000000000201'::uuid, 'aub', 'Beirut Chants: Trio di Parma', 'Chamber music evening with the Trio di Parma.', 'music', 'Assembly Hall', 'Main Campus', '2026-12-04 20:00+02', '2026-12-04 22:00+02', 'photo-1501386761578-eac5c94b800a', 'https://beirutchants.com/'),
 ('22222222-0000-0000-0000-000000000202'::uuid, 'aub', 'Beirut Chants: Szymon Nehring, piano', 'Recital by Polish pianist Szymon Nehring.', 'music', 'Assembly Hall', 'Main Campus', '2026-12-18 20:00+02', '2026-12-18 22:00+02', 'photo-1501386761578-eac5c94b800a', 'https://beirutchants.com/')
)
insert into public.events (id, university_id, title, summary, description, category, venue, campus, starts_at, ends_at, cover_url, visibility, status, source_url, time_tbc, is_demo)
select v.id, u.id, v.title, v.summary,
       v.summary || E'\n\nListed on the university''s official events page. Check the source for the exact time and registration details.',
       v.category, v.venue, v.campus, v.starts_at, v.ends_at,
       'https://images.unsplash.com/' || v.cover || '?w=1600&q=70', 'public', 'published',
       case when v.src like '/%' then 'https://eventscal.lau.edu.lb' || v.src else v.src end,
       true, false
from v join u on u.slug = v.slug
on conflict (id) do nothing;

-- Free RSVP ticket for every real event (prototype; capacity is a placeholder).
insert into public.ticket_types (event_id, name, description, price_cents, quantity, max_per_order)
select e.id, 'Free entry', 'RSVP so the gate can scan you in', 0, 300, 2
from public.events e
where e.id::text like '22222222-%' and not exists (select 1 from public.ticket_types t where t.event_id = e.id);

-- ---------- Sample events for universities with no public listing found ----------
with u as (select id, slug from public.universities),
v(id, slug, title, summary, category, venue, campus, starts_in, hours, cover, visibility, types) as (values
 ('33333333-0000-0000-0000-000000000001'::uuid, 'ndu', 'NDU Christmas Choir Night', 'Carols and a candle-lit choir performance.', 'music', 'Abou Khater Auditorium', 'Zouk Mosbeh', interval '5 days 19 hours', 2, 'photo-1501386761578-eac5c94b800a', 'public', 'free'),
 ('33333333-0000-0000-0000-000000000002'::uuid, 'ndu', 'Engineering Capstone Expo', 'Final-year teams demo their projects.', 'tech', 'Faculty of Engineering', 'Zouk Mosbeh', interval '9 days 10 hours', 5, 'photo-1504384308090-c894fdcc538d', 'students', 'free'),
 ('33333333-0000-0000-0000-000000000003'::uuid, 'liu', 'LIU Career Day', 'Meet employers from banking, tech and healthcare.', 'career', 'Main Hall', 'Beirut', interval '4 days 10 hours', 6, 'photo-1540575467063-178a50c2df87', 'public', 'free'),
 ('33333333-0000-0000-0000-000000000004'::uuid, 'liu', 'Futsal Tournament Final', 'Inter-faculty futsal final.', 'sports', 'Sports Center', 'Beirut', interval '8 days 17 hours', 2, 'photo-1546519638-68e109498ffc', 'public', 'paid'),
 ('33333333-0000-0000-0000-000000000005'::uuid, 'bau', 'BAU Architecture Open Studio', 'Students present their design studio work.', 'arts', 'Faculty of Architecture', 'Debbieh', interval '6 days 11 hours', 4, 'photo-1562774053-701939374585', 'public', 'free'),
 ('33333333-0000-0000-0000-000000000006'::uuid, 'bau', 'Health Sciences Symposium', 'Talks on public health and nursing research.', 'academic', 'Jamal Abdel Nasser Hall', 'Beirut', interval '11 days 9 hours', 6, 'photo-1576091160550-2173dba999ef', 'public', 'free'),
 ('33333333-0000-0000-0000-000000000007'::uuid, 'ua', 'UA Music Faculty Winter Recital', 'Students of the Faculty of Music in recital.', 'music', 'Main Auditorium', 'Baabda', interval '7 days 19 hours', 2, 'photo-1501386761578-eac5c94b800a', 'public', 'paid'),
 ('33333333-0000-0000-0000-000000000008'::uuid, 'ua', 'Film Screening & Talk', 'Student short films followed by a director Q&A.', 'arts', 'Cinema Room', 'Baabda', interval '3 days 18 hours', 2, 'photo-1511795409834-ef04bbd61622', 'public', 'free'),
 ('33333333-0000-0000-0000-000000000009'::uuid, 'lu', 'LU Science Fair', 'Faculty of Sciences research posters and demos.', 'academic', 'Rafic Hariri Campus', 'Hadath', interval '10 days 10 hours', 5, 'photo-1576091160550-2173dba999ef', 'public', 'free'),
 ('33333333-0000-0000-0000-000000000010'::uuid, 'lu', 'Debate Club Championship', 'Inter-faculty debate final.', 'social', 'Rafic Hariri Campus', 'Hadath', interval '13 days 16 hours', 3, 'photo-1511795409834-ef04bbd61622', 'public', 'free'),
 ('33333333-0000-0000-0000-000000000011'::uuid, 'aub', 'AUB Outdoors Winter Market', 'Student clubs, food stands and live music.', 'social', 'Green Oval', 'Main Campus', interval '2 days 15 hours', 5, 'photo-1511795409834-ef04bbd61622', 'public', 'free')
)
insert into public.events (id, university_id, title, summary, description, category, venue, campus, starts_at, ends_at, cover_url, visibility, status, is_demo)
select v.id, u.id, v.title, v.summary, v.summary || E'\n\nSample event created for the Connect prototype.',
       v.category, v.venue, v.campus,
       date_trunc('day', now()) + v.starts_in - interval '2 hours',
       date_trunc('day', now()) + v.starts_in - interval '2 hours' + make_interval(hours => v.hours),
       'https://images.unsplash.com/' || v.cover || '?w=1600&q=70', v.visibility::public.event_visibility, 'published', true
from v join u on u.slug = v.slug
on conflict (id) do nothing;

insert into public.ticket_types (event_id, name, description, price_cents, quantity, max_per_order, sort_order)
select e.id, x.name, x.descr, x.price, x.qty, 4, x.sort
from public.events e
cross join lateral (values
  ('General', null::text, case when e.id::text in ('33333333-0000-0000-0000-000000000004','33333333-0000-0000-0000-000000000007') then 500 else 0 end, 250, 0)
) as x(name, descr, price, qty, sort)
where e.id::text like '33333333-%' and not exists (select 1 from public.ticket_types t where t.event_id = e.id);

select
  (select count(*) from public.events where not is_demo) as real_events,
  (select count(*) from public.events where is_demo) as sample_events,
  (select count(*) from public.universities where logo_url like '/logos/%') as logos;
