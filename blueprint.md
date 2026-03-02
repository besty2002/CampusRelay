# Project Blueprint - Campus Relay

## Project Overview
Campus Relay (新田学園リレーシェア) is a platform for students to share and exchange items within their school or region.

## Current State
- **Frontend:** React (TypeScript) + Vite + Tailwind CSS.
- **Icons:** Lucide-React.
- **Routing:** React Router DOM.
- **Database/Auth:** Supabase integrated (credentials configured in .env).
- **Authentication:** 
  - Login/Signup form implemented in `LoginPage.tsx`.
  - Session management integrated into `App.tsx`.
  - Protected routes (Create Post, Messages, Profile).

## Database Schema (Planned)
### `profiles` Table
Stores additional user information.
- `id`: UUID (references `auth.users`)
- `name`: Text
- `school_id`: Text
- `school_name`: Text
- `region_id`: Text
- `region_name`: Text
- `role`: Text (譲る, 受け取る, 両方)
- `completed_count`: Integer
- `rating`: Float
- `status`: Text (PENDING, VERIFIED, BANNED)
- `avatar_url`: Text

## Planned Steps
1. **Supabase Setup:**
   - Execute SQL to create `profiles` table.
   - Set up Row Level Security (RLS) for `profiles`.
   - Create a trigger to automatically create a profile entry on user signup.
2. **Integration:**
   - Update `LoginPage.tsx` to collect additional user data during signup.
   - Replace `mockApi.ts` with real Supabase calls.
3. **Features:**
   - Profile management page.
   - Real-time chat using Supabase Realtime.
