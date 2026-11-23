# Connect — Plan & Infrastructure (A → Z)

Connect is a mobile-first web app (PWA) for university events. Users pick the universities
they care about, browse what's happening, buy tickets, and get a QR ticket that is scanned at
the campus gate. Each university runs its own admin console; the platform owners manage
universities and sponsor deals.

---

## 1. The four surfaces

| Surface | Who | URL | What it does |
|---|---|---|---|
| **Attendee app** | Anyone (sign in to buy) | `/`, `/u/[slug]`, `/e/[id]`, `/tickets` | Search universities, follow them, browse live/upcoming events, buy tickets, show QR ticket |
| **Gate scanner** | University staff with *scanner* role | `/scan` | Camera scanner: green = admit, red = reject (used / wrong event / fake / expired) |
| **University admin** | University *admin* / *organizer* | `/admin/[slug]` | Create/publish events, ticket types & prices, sponsors for that university, staff, sales & check-in stats |
| **Owner console** | Platform owners | `/owner` | Add universities + assign their first admin, sponsor-inquiry pipeline (new → contacted → won/lost), platform-wide sponsors |
| **Sponsor form** | Public | `/sponsor` | Companies send a form + email; owners follow up by phone/email |

## 2. Best ideas borrowed from existing apps

Researched the leading ticketing / campus-event apps and kept the strongest pattern from each
(patterns only — all code, art and copy are original):

| App | Pattern adopted |
|---|---|
| **Ticketmaster SafeTix** | **Rotating QR code** that changes every 15 s, so a screenshot of a ticket is useless. Works offline once the ticket is loaded. |
| **DICE** | Tickets live only in the app/phone, clean dark "ticket wallet", big bold ticket card. |
| **Luma** | Beautiful single-page event layout: cover image, date block, location, "Add to calendar" (.ics). |
| **Eventbrite** | Ticket types (General, Student, VIP), quantity caps, free + paid tickets, organizer sales dashboard. |
| **Campus apps (CampusGroups, Presence/Engage)** | University-scoped feeds, university staff roles, students-only events (verified by email domain). |
| **Partiful** | Playful, friendly micro-interactions and share links. |
| **Apple Wallet style** | Brightness-friendly ticket card, haptic + sound feedback at the scanner. |

## 3. Tech stack (all managed, free tiers to start)

| Layer | Choice | Why |
|---|---|---|
| Frontend + API | **Next.js 16** (App Router, TypeScript) | One codebase for UI and server routes; first-class on Vercel |
| Styling / motion | **Tailwind CSS 4**, **Motion** (Framer Motion), **lucide** icons, **sonner** toasts | Fast to build polished UI + animations |
| Install to home screen | **PWA**: web manifest + service worker + iOS "Share → Add to Home Screen" coach mark | Works on iPhone & Android without app stores |
| Database / auth / storage | **Supabase** (Postgres + Row Level Security + Storage) | Matches the existing project; RLS enforces per-university access in the database itself |
| Sign in | **Google** and **Microsoft (Azure / Entra ID)** OAuth through Supabase Auth, plus email magic-link fallback | Students mostly have Google or Microsoft (Outlook/O365) university accounts |
| Payments | **Stripe Checkout** (test mode first) behind a provider interface | Hosted, PCI-compliant, Apple/Google Pay. ⚠️ Stripe doesn't onboard Lebanese businesses — if the company is in Lebanon, swap in a local gateway (e.g. Areeba/OMT/Whish) behind the same interface. Free events skip payment. |
| QR | `qrcode` (generate) + `qr-scanner` (camera scan, uses native BarcodeDetector when available) | Small, fast, works on iOS Safari |
| Email (optional) | **Resend** | Notifies owners when a sponsor form arrives |
| Hosting | **Vercel** (app) + **Supabase** (DB) + **GitHub** (code) | Push to `main` → auto-deploy |

## 4. Data model (Supabase / Postgres)

```
universities ─┬─< university_members >── profiles (auth.users)
              ├─< events ─┬─< ticket_types
              │           ├─< orders ──< tickets ──< check_ins
              │           └─< saved_events
              ├─< sponsors (university_id null = platform-wide)
              └─< follows (user follows university)
sponsor_inquiries (public form → owner pipeline)
```

* **Roles**: `profiles.is_owner` (platform owner) and `university_members.role` ∈ `admin | organizer | scanner`.
* **Ticket security**: each ticket has a random `code` and a private `secret`. The QR shows
  `CNCT1.<code>.<6-digit rolling code>` (HMAC-SHA256 of the secret and the 15-second time window).
  The scanner sends it to `/api/scan`, which checks: ticket exists, rolling code is valid (±30 s),
  ticket belongs to an event the scanner is staff for, event is today, ticket not used → marks
  it used atomically. Every scan is logged in `check_ins`.
* **Capacity** is enforced inside Postgres functions that lock the ticket-type row, so two
  buyers can never get the last seat.
* **RLS**: every table has policies; the browser only ever uses the public *anon* key. The
  service-role key is used only in server routes (Stripe webhook, scanner).

## 5. Key flows

1. **Sign in** → Google / Microsoft → Supabase creates `auth.users` → trigger creates `profiles`.
2. **Find events** → search universities → follow → home feed shows "Happening now", "This week", followed universities.
3. **Buy** → choose ticket type + quantity → free: `claim_free_tickets()` RPC issues tickets instantly;
   paid: server creates `orders(pending)` + Stripe Checkout → Stripe webhook → `fulfill_order()` issues tickets.
4. **Gate** → staff opens `/scan`, picks event, points camera → full-screen green/red result with name & ticket type.
5. **University admin** → create event (draft) → add ticket types → publish → watch sales/check-ins live.
6. **Sponsor** → `/sponsor` form → `sponsor_inquiries` (+ email to owners) → owner calls/emails →
   marks *won* → adds logo in `/owner` (platform-wide) or the university adds it in its admin → logo appears on home, university and event pages.

## 6. Environments & accounts you need

| Account | Used for | Who sets up |
|---|---|---|
| GitHub | Code repo | You (logged in this session) |
| Supabase | DB + auth + storage | You create project; I paste the SQL / guide you |
| Google Cloud Console | Google OAuth client ID/secret | Guided step-by-step |
| Microsoft Entra (Azure portal) | Microsoft OAuth app registration | Guided step-by-step |
| Vercel | Hosting (connect GitHub repo) | Guided |
| Stripe (test mode) | Payments | Optional until you want paid tickets |
| Resend | Email notifications | Optional |

Exact click-by-click setup lives in [`SETUP.md`](./SETUP.md).

## 7. Roadmap

* **Phase 1 (this scaffold)** — everything above working end-to-end with Stripe test mode.
* **Phase 2** — email ticket receipts, push notifications for followed universities, waitlist,
  refunds, CSV export, offline scanner queue, analytics charts.
* **Phase 3** — wrap PWA with Capacitor for App Store / Play Store if needed, local payment gateway,
  Apple/Google Wallet passes.
