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

### `chat_rooms` Table (Updated)
- `id`: UUID
- `post_id`: UUID (references `posts`)
- `seller_id`: UUID (references `profiles`)
- `buyer_id`: UUID (references `profiles`)
- `last_message_text`: Text (최신 메시지 미리보기)
- `last_message_at`: Timestamptz (최신 메시지 시간)
- `unread_count_seller`: Integer (판매자 안읽은 수)
- `unread_count_buyer`: Integer (구매자 안읽은 수)
- `created_at`: Timestamptz

### `chat_messages` Table (Updated)
- `id`: UUID
- `room_id`: UUID (references `chat_rooms`)
- `sender_id`: UUID (references `profiles`)
- `text`: Text
- `is_read`: Boolean (읽음 확인)
- `created_at`: Timestamptz

## Completed Features
### Real-time Chat System (LINE-style) ✅
1. **Realtime Bug Fix:** 
   - Fixed useEffect cleanup for Supabase channel subscription
   - Added duplicate message prevention
   - Proper channel cleanup on unmount
2. **LINE-style Chat Room UI:**
   - Green (#06C755) color scheme matching LINE
   - Message bubbles with tail shapes (rounded-tr-sm / rounded-tl-sm)
   - Date separators (e.g., "2026年4月30日(水)")
   - "既読" (read) indicator on sent messages
   - Partner avatar + name display
   - Typing indicator (3 bouncing dots) via Supabase Presence API
   - Full-screen chat room (no bottom nav bar)
   - Scroll-to-bottom button
   - Item card linked at top of chat
3. **Chat List Improvements:**
   - Realtime subscription for list updates
   - Last message preview
   - Unread message count badges (red)
   - Relative time display (たった今, X分前, etc.)
   - Search functionality
   - Auto-sort by last message time
4. **Database Schema Enhancements:**
   - `is_read` column on `chat_messages`
   - `last_message_text`, `last_message_at`, unread counts on `chat_rooms`
   - Trigger to auto-update `chat_rooms` on new message insert
   - Realtime publication enabled for both tables
   - RLS policies for read status updates

## Planned Steps
1. **Supabase SQL Execution:**
   - Run `supabase/chat_realtime_upgrade.sql` in Supabase Dashboard
   - Run `supabase/trust_system.sql` in Supabase Dashboard (manner_temp, email_verified, manner_tags)
2. **Integration:**
   - Update `LoginPage.tsx` to collect additional user data during signup.
   - Replace `mockApi.ts` with real Supabase calls.
3. **Features:**
   - Profile management page.
   - Push notifications for new messages.

### Trust & Manner Evaluation System ✅
1. **Manner Temperature (マナー温度):**
   - 36.5°C starting temp, 0~99°C range
   - DB trigger `update_manner_temp()` adjusts temp on review insert
   - `MannerTempGauge` component with gradient bar, emoji, color coding
   - Displayed on ProfilePage, UserPublicProfilePage, PostDetailPage
2. **Verified Badge (学校認証バッジ):**
   - `email_verified` + `verified_school_domain` fields on profiles
   - `VerifiedBadge` component with hover tooltip
   - Displayed on ProfilePage, UserPublicProfilePage, PostDetailPage
3. **Enhanced Review System:**
   - `ReviewModal` component with star rating, manner keyword tags, comment
   - Manner tags: 時間を守る, 丁寧な対応, 返信が早い, 商品が綺麗, 説明通り, また取引したい
   - Negative tags: 時間に遅れた, 返信が遅い, 説明と違った
   - Tags displayed in review cards on UserPublicProfilePage
   - `manner_tags text[]` column on reviews table
