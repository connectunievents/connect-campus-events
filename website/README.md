# Connect

Connect is a university-events capstone built with static HTML/CSS/JavaScript, an Express API, Supabase Auth/Postgres, and Groq for contextual event help.

## Structure

- `html pages/` — existing public/auth pages plus `check-in.html`
- `codes/` — shared Supabase access, API client, event UI, chatbot, and interactions
- `server/` — Express application, routes, middleware, services, and endpoint tests
- `supabase/migrations/` — additive database changes required by the API
- `../connect_backup.sql` — original database dump used as the schema source of truth

The dump contains Supabase Auth records and is intentionally ignored by the parent `.gitignore`; treat it as sensitive local backup data.

## Local setup

Requirements: Node.js 20+ and an existing Supabase project matching `connect_backup.sql`.

```bash
cd "capstone project/website/server"
npm install
cp .env.example .env
```

Fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a random secret of at least 32 characters in `JWT_SECRET`. Add `GROQ_API_KEY` to enable AI answers. The Supabase service-role key and all other secrets belong only in `server/.env`; never place them in browser code.

Run `supabase/migrations/20260905_connect_backend.sql` once in the Supabase SQL Editor. It adds the missing `organizer` enum value and a service-role-only transactional registration function. It does not delete or replace any data or RLS policy.

Start the full local app:

```bash
cd "capstone project/website/server"
npm start
```

Open `http://localhost:3000`. Express serves both the frontend and API, so no second static server is needed. If the frontend is served separately on port 8080, its API helper automatically uses `http://localhost:3000`; otherwise set `window.CONNECT_API_URL` before `access-control.js` loads.

Run tests with:

```bash
cd "capstone project/website/server"
npm test
```

## API

| Method | Route | Access |
|---|---|---|
| GET | `/health` | Public |
| GET | `/api/auth/me` | Authenticated |
| GET | `/api/events` | Public plus university/private visibility when authenticated |
| GET | `/api/events/:id` | Visibility-aware |
| POST | `/api/events` | Organizer/admin |
| POST | `/api/events/:id/register` | Authenticated and eligible |
| POST | `/api/sponsors/apply` | Public, validated, honeypot and rate-limited |
| GET | `/api/sponsors` | Public active listings only |
| PATCH | `/api/sponsors/applications/:id` | Admin |
| POST | `/api/checkin` | Organizer for owned event/admin |
| POST | `/api/chatbot` | Public, rate-limited |
| POST | `/api/payments/create` | Authenticated registration owner; mock only in development |
| POST | `/api/payments/webhook` | Webhook-secret protected placeholder/mock handler |

Query parameters for events: `university`, `category`, `date`, `from`, `to`, `search`, `visibility`, `page`, and `limit`.

## Architecture notes

Supabase continues to authenticate users in the browser. Protected API calls send the Supabase access token as a Bearer token. Express verifies it with Supabase, loads the server-trusted profile role, applies route authorization, and uses the backend-only service client. Existing RLS remains enabled as defense in depth.

Registration capacity is checked inside a Postgres function while locking the event row, preventing two simultaneous requests from taking the same final place. The existing unique event/user constraint prevents duplicates. Full events produce `waitlisted` registrations. Confirmed free registrations receive an HS256-signed, expiring token rendered as a QR image; no predictable raw registration ID is encoded. Check-in verifies the signature, registration, event ownership, ticket state, and atomic unused-ticket condition.

The chatbot performs small `ILIKE` searches over public events and active sponsors, gives that context to Groq, and tells the model not to invent database facts. When Groq is unavailable, the frontend explicitly labels and uses its limited built-in help guide.

Payments use a provider service boundary. `PAYMENT_PROVIDER=mock` creates clearly labeled development-only references and transfers no money. Production rejects the mock provider. The webhook deliberately uses no fabricated Wish Money/OMT protocol; provider-specific signature verification must replace the placeholder after approval and documentation are supplied.

Email uses a service boundary with a development console preview. Registration flow is not blocked when a provider is absent.

## External steps for production

- Supply real Supabase/Groq secrets and rotate any secret that has ever been exposed.
- Obtain Wish Money/OMT approval and implement their documented signing/API rules in the payment service.
- Select an email provider, verify the sending domain/university permissions, and implement its adapter.
- Configure production hosting, HTTPS, the exact `FRONTEND_URL`, domain, and DNS.
- Add a storage bucket/upload policy if sponsor logos should be uploaded directly (the current application safely submits text fields; admins can add a logo URL to the approved listing).
- Perform provider sandbox/end-to-end camera tests before production launch.
