# Connect Supabase setup

## Database setup

The original schema is documented in `../../connect_backup.sql`. Apply files in
`migrations/` in filename order. The backend migration is additive and preserves
the existing Row Level Security policies.

The Connect Guide now calls the Express `/api/chatbot` route. That route searches
public Supabase events/sponsors and sends only the relevant context to Groq. Its
API key remains in `server/.env`. The browser's built-in guide is an explicitly
labeled fallback when the server or provider is unavailable.

Keep Supabase email confirmation enabled so verified students continue to be
enforced by the existing sponsor policy.
