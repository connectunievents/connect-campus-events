# Connect — campus events, tickets & QR entry

Connect is an installable web app (PWA) for university events. Students pick the universities they care about,
see what's happening right now, buy tickets, and get a **rotating QR ticket** that is scanned at the campus gate.
Each university has its own admin console. Sponsors apply through a form and appear across the app.

| | |
|---|---|
| **Attendee app** | `/` home feed · `/explore` search · `/u/<uni>` · `/e/<event>` · `/tickets` wallet |
| **Gate scanner** | `/scan` → camera scanner with green / amber / red results |
| **University admin** | `/admin/<uni>` events, ticket types, attendees CSV, team, sponsors, settings |
| **Owner console** | `/owner` universities · sponsor inquiries pipeline · platform sponsors |
| **Sponsor form** | `/sponsor` |

## Repo layout

```
app/                 Next.js 16 app (deploy this folder)
  src/app/           routes (attendee pages in (app)/, admin/, owner/, scan/, api/)
  src/components/    UI components
  src/lib/           Supabase clients, auth, queries, rotating QR crypto, payments
  supabase/          SQL migration (schema + RLS + functions) and seed data
  tests/             unit tests (rotating QR)
docs/PLAN.md         architecture & product plan
docs/SETUP.md        step-by-step setup: Supabase, Google, Microsoft, Vercel, Stripe
website/             original static prototype (kept for reference)
```

## Quick start

```bash
cd app
cp .env.example .env.local   # fill in Supabase keys — see docs/SETUP.md
npm install
npm run dev                  # http://localhost:3000
npm test                     # unit tests
```

Stack: Next.js 16 · React 19 · Tailwind CSS 4 · Motion · Supabase (Postgres, Auth, Storage, RLS) ·
Google & Microsoft OAuth · Stripe Checkout (or demo payments) · qr-scanner · Vercel.
