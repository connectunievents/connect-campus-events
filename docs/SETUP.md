# Connect — Setup guide (click by click)

Do these in order. Total time ≈ 45 minutes. Everything has a free tier.

---

## 1. Supabase (database + login)

1. Go to <https://supabase.com/dashboard> → **New project**.
   * Name: `connect` · Region: closest to your users (e.g. *Frankfurt* for Lebanon) · set a strong DB password and save it.
2. When it's ready: **SQL Editor → New query**. Paste all of
   [`app/supabase/migrations/20261123000000_init.sql`](../app/supabase/migrations/20261123000000_init.sql) → **Run**.
3. New query again → paste [`app/supabase/seed.sql`](../app/supabase/seed.sql) → **Run** (demo universities + events).
4. **Project Settings → API keys**: copy
   * Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   * `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   * `service_role` / secret key → `SUPABASE_SERVICE_ROLE_KEY` (**never share or commit this**)
5. **Authentication → URL Configuration**
   * Site URL: `http://localhost:3000` (change to your Vercel URL later)
   * Redirect URLs: add `http://localhost:3000/**` and later `https://YOUR-APP.vercel.app/**`
6. Note your **callback URL** — `https://<project-ref>.supabase.co/auth/v1/callback`. Google and Microsoft both need it.

## 2. Google sign-in

1. <https://console.cloud.google.com> → create project **Connect**.
2. **APIs & Services → OAuth consent screen** → External → app name *Connect*, support email, add your
   domain later → **Publish app** when ready (while in *Testing*, only listed test users can log in).
3. **Credentials → Create credentials → OAuth client ID** → *Web application*.
   * Authorized JavaScript origins: `http://localhost:3000`, `https://YOUR-APP.vercel.app`
   * Authorized redirect URIs: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Copy **Client ID** + **Client secret** → Supabase **Authentication → Sign In / Providers → Google** → enable, paste, save.

## 3. Microsoft sign-in (Azure / Entra ID)

1. <https://portal.azure.com> → **Microsoft Entra ID → App registrations → New registration**.
   * Name: *Connect*
   * Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
     (lets students sign in with their university Office 365 *and* Outlook accounts)
   * Redirect URI: *Web* → `https://<project-ref>.supabase.co/auth/v1/callback`
2. Copy **Application (client) ID**.
3. **Certificates & secrets → New client secret** → copy the **Value** (shown once).
4. **Token configuration → Add optional claim → ID → `email`** (and accept the Graph permission prompt).
5. Supabase **Authentication → Sign In / Providers → Azure** → enable, paste Client ID + Secret.
   Then set `NEXT_PUBLIC_AUTH_MICROSOFT=1` (in `.env.local` and on Vercel) to show the Microsoft button.
   Azure Tenant URL: leave empty (or `https://login.microsoftonline.com/common`). Save.

> Some universities block third-party apps for their students' Microsoft accounts. If a student sees
> "Need admin approval", the university's IT must approve *Connect* once in their tenant.

## 4. Run locally

```bash
cd app
cp .env.example .env.local      # then paste the keys from step 1
npm install
npm run dev
```

Open <http://localhost:3000>, sign in, then make yourself the **platform owner** (SQL Editor):

```sql
update public.profiles set is_owner = true where email = 'YOUR-EMAIL@gmail.com';
```

Now `/owner` and every `/admin/<university>` console open for you. Add university admins from the
owner console (they must sign in once first).

## 5. GitHub

The repo is pushed from this machine with the `gh` CLI. Collaborators: repo → **Settings → Collaborators**.

## 6. Deploy on Vercel

1. <https://vercel.com/new> → import the GitHub repo.
2. **Root Directory: `app`** (important). Framework: Next.js (auto).
3. Add the environment variables from `.env.example` (set `NEXT_PUBLIC_SITE_URL` to the Vercel URL).
4. Deploy. Then add the Vercel URL to: Supabase Site URL + Redirect URLs, Google JS origins.

## 7. Payments (optional, when you want real paid tickets)

* `PAYMENT_PROVIDER=demo` (default) simulates payment — nothing is charged. Good for demos/grading.
* For Stripe: create an account, use **test mode** keys → `STRIPE_SECRET_KEY`, set `PAYMENT_PROVIDER=stripe`.
  Webhook: **Developers → Webhooks → Add endpoint** `https://YOUR-APP/api/stripe/webhook`, events
  `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed` → copy signing secret → `STRIPE_WEBHOOK_SECRET`.
* ⚠️ Stripe can't onboard businesses registered in Lebanon. If the company is Lebanese, plug a local
  gateway (Areeba, Whish, OMT Pay…) into `src/lib/payments.ts` + a webhook route — the database
  functions (`create_order` / `fulfill_order` / `fail_order`) stay the same.

## 8. Sponsor email alerts (optional)

Create a <https://resend.com> account → API key → `RESEND_API_KEY`, set `OWNER_NOTIFY_EMAIL` to the
owners' inbox (comma-separate several). Without it, inquiries still land in `/owner/inquiries`.

## 9. Installing on phones

* **iPhone (Safari):** open the site → Share → *Add to Home Screen*. The app shows this hint automatically.
* **Android (Chrome):** an *Install app* button appears in the app, or ⋮ → *Install app*.
