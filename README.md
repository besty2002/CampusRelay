# CampusRelay

CampusRelay is a school-based item sharing platform for local communities.
The MVP focuses on helping students and families give away or exchange school-related items safely within their school network.

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: Supabase (Database, Auth, Storage, Edge Functions)
- Hosting: Cloudflare Pages
- PWA: Vite PWA / Workbox

## Core Features

- School-scoped item feed
- Giveaway and exchange posts
- Post images and item status management
- Wishlist, comments, reports, and admin moderation
- Realtime chat with image messages and appointment proposals
- Push notifications and keyword alerts

## Project Structure

```text
src/
  components/
  hooks/
  lib/
  pages/
  test/
  App.tsx
  main.tsx

supabase/
  functions/
  migrations/
  *.sql
```

## Environment

Copy `.env.example` to `.env` and fill in the public Vite values for local development.
Supabase Edge Function secrets must be configured in Supabase, not committed to the repository.

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run build
npm run test
npm run lint
```

`npm run lint` may still report type cleanup items in legacy pages. Build and tests are the current required verification gates.

## Security Notes

- Supabase RLS is required for all user-owned and chat-owned data.
- Admin moderation is enforced through database policies, not only through UI checks.
- Storage uploads must be scoped by post ownership or chat room participation.
- Do not commit real `.env` files.
