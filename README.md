# SplitBill

A mobile-first group expense splitter for trips, roommates, friends, and outings. Create groups, keep shared costs in one place, and get a clear, minimal payment plan.

## Run it now (demo mode)

Requirements: Node.js 20.19+ or 22.12+ and npm.

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. The app starts immediately with sample trips, friends, expenses, and balances; no account or Supabase credentials are needed. Demo mode is clearly labeled, and changes are saved in this browser only. Use **Settings → Reset demo data** to restore the sample workspace.

## Features

- Create groups with a name, description, group type, currency, dates, and member names. Copy an invite link to share with friends.
- Add, edit, and delete expenses. Choose a payer, date, category, notes, and participating members.
- Add and remove members from a group. Members tied to expenses or settlements stay until that history is removed, preserving valid balances.
- Split expenses evenly (including leftover cents), by exact amounts, or by percentages. Custom splits are validated before saving.
- Editing an expense preserves its split method and custom split values.
- See member balances, expense/category summaries, history filters, and a minimum-transfer payment plan.
- Mark payments complete. Completed payments adjust outstanding balances exactly once and appear in the settlement history.
- Share invite links and join a demo group from the same browser; demo data is browser-local and is not synced between devices.
- Demo data and the selected group persist in `localStorage` under demo-only keys.

## Development

```powershell
npm test
npm run build
```

## Supabase setup

The demo works independently of Supabase. To prepare a real backend:

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the project’s **public** project URL and publishable/anon key.
4. Restart the Vite dev server after changing environment variables.

Only the public anon/publishable key belongs in a browser app. **Never** put a service-role key, database password, or other secret in a `VITE_` variable. The schema enables row-level security on every table; group reads/writes are restricted to authenticated group members and owners.

The SQL schema includes groups, members, expenses, per-member splits, completed settlements, and hashed invite records. A production invite flow should generate a cryptographically random token on a trusted server/Edge Function, store only its SHA-256 hash in `group_invites`, and validate expiry/usage and add the invited authenticated user in one server-side transaction. Do not expose invite token hashes or allow unauthenticated direct membership inserts. The initial browser experience intentionally stays in local demo mode; configure authentication and connect the repository operations before using real group data.

## Deploy

### Vercel

1. Import the repository in Vercel and select the Vite framework preset.
2. Use `npm run build` as the build command and `dist` as the output directory.
3. For the demo, no environment variables are required. For a connected Supabase deployment, add only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project settings, then redeploy.

### Supabase

Create a Supabase project and run `supabase/schema.sql` in its SQL Editor as described above. Keep the Supabase service role key exclusively in trusted server-side/Edge Function secrets. A production invite-claim Edge Function must verify tokens and membership; never bypass the row-level security policies from the client.

## Project layout

```text
src/
  data/              clearly labeled demo fixtures
  hooks/             browser-persisted demo state
  lib/               Supabase client configuration
  types/             shared domain types
  utils/             split, balance, settlement, and currency logic
  App.tsx             responsive app shell and workflows
  styles.css          visual system and responsive layouts
supabase/
  schema.sql          database tables, indexes, and RLS policies
```
