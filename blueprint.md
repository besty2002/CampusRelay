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
   - ⚠️ Run `supabase/category_schema_fix.sql` in Supabase Dashboard (category constraint sync)
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

### Language & Quality Fix (2026-05-04) ✅
1. **한/일 혼재 버그 수정:**
   - `PostDetailPage.tsx`: 4개 문자열 일본어 통일
   - `NotificationSettingsPage.tsx`: 전체 UI 문자열 일본어 통일 (16개소)
   - `ChatRoomPage.tsx`: 에러 메시지 일본어 통일
   - `send-web-push/index.ts`: 푸시 알림 제목/본문 일본어 통일 (4개소)
2. **하단 네비 알림 뱃지 (Unread Badge):**
   - `NavLink` 컴포넌트에 `badge` prop 추가
   - `Layout`에서 Supabase Realtime으로 `chat_rooms` 구독
   - トーク 탭에 미읽은 메시지 수 표시 (빨간 뱃지, 99+ 처리)
3. **카테고리 스키마 수정:**
   - `category_schema_fix.sql` 작성
   - DB CHECK 제약조건을 프론트엔드 6개 카테고리와 동기화
   - 기존 `Supplies` → `Life` 마이그레이션 포함

### Infinite Scroll & Image Viewer & Avatar System (2026-05-04) ✅
1. **무한 스크롤 (Infinite Scroll):**
   - `useInfiniteScroll` 커스텀 훅 생성 (IntersectionObserver 기반)
   - `HomePage`, `FeedPage`에 적용 — 페이지당 20개씩 로드
   - 필터/검색 변경 시 자동 리셋, 중복 방지
   - 로딩 스피너 + "すべてのアイテムを表示しました" 종료 UI
   - 이미지 lazy loading (`loading="lazy"`) 적용
   - 검색 debounce 최적화 (400ms)
2. **풀스크린 이미지 뷰어 (ImageViewer):**
   - `ImageViewer` 컴포넌트 신규 생성
   - 핀치 줌 (모바일 2점 터치)
   - 마우스 휠 줌 (데스크톱)
   - 더블탭/더블클릭 줌 토글
   - 드래그 팬 (확대 상태에서 이미지 이동)
   - 좌/우 화살표 네비게이션 + 키보드 단축키
   - 닷 인디케이터 + 줌 퍼센트 표시
   - `PostDetailPage` 이미지 갤러리에 통합
3. **프로필 아바타 업로드:**
   - `avatar_url` 필드 추가 (Profile 타입 + DB 마이그레이션)
   - `UserAvatar` 재사용 컴포넌트 생성 (5단계 사이즈)
   - `ProfilePage`에 아바타 업로드 UI (카메라 아이콘 오버레이)
   - 이미지 압축 적용 (0.3MB, 400px, browser-image-compression)
   - Supabase Storage `avatars` 버킷 사용
   - `UserPublicProfilePage`에도 아바타 표시 적용
   - ⚠️ `supabase/avatar_system.sql` 실행 + Storage 'avatars' 버킷 생성 필요

### Transaction Scheduling (2026-05-04) ✅
1. **채팅 내 거래 약속(약속 캘린더) 연동:**
   - `chat_messages` 테이블에 `appointment_data` (JSONB) 컬럼 추가 (`chat_appointments.sql` 작성)
   - 입력창(footer)에 📅 캘린더 아이콘 버튼 추가
   - `AppointmentModal.tsx` 생성: 날짜, 시간, 약속 장소 입력 (최소 날짜를 오늘로 제한)
   - 채팅 메시지 내 약속 카드 UI 렌더링 (`proposed`, `accepted`, `canceled` 상태별 표시)
   - 상대방이 받은 약속 제안에 대해 `承諾する(승낙)`, `断る(거절)` 상호작용 액션 추가
   - 낙관적 업데이트(Optimistic UI) 완벽 지원

### Admin System (2026-05-13) ✅
1. **Phase 1 — 管理者ダッシュボード統計:**
   - `AdminLayout.tsx`: サイドバータブナビ、school_admin/super_admin権限分岐
   - `AdminOverviewPage.tsx`: 7統計カード(ユーザー数, 新規登録, 出品中, 通報, メッセージ数, 認証済, BAN中)
   - `StatCard.tsx`: 再利用可能な統計カード (6色テーマ, トレンド表示)
   - Recharts: 直近7日間の新規投稿 棒グラフ + カテゴリ分布 円グラフ
2. **Phase 2 — ユーザー管理:**
   - `AdminUsersPage.tsx`: ユーザー一覧 (検索, ロールフィルター, BANフィルター, ページネーション)
   - BAN/UNBAN: プロフィール更新 + 全投稿非表示連動 + 通知送信 + 監査ログ
   - ロール変更: super_adminのみ (user ↔ school_admin ↔ super_admin)
   - 学校認証の手動付与/取消
   - DB: `is_banned`, `banned_at`, `ban_reason` カラム追加 (profiles)
3. **Phase 3 — 通報管理強化:**
   - `AdminReportsPage.tsx`: 通報一覧 (ステータス/種別フィルター, ページネーション)
   - 対応モーダル: 投稿非表示 / コメント非表示 / 警告送信 / BAN (super_adminのみ)
   - 管理者メモ、対応者・対応日時の記録
   - DB: target_type, category, resolved_by, resolved_at, admin_note 追加 (reports)
4. **Phase 4 — コンテンツ管理:**
   - `AdminPostsPage.tsx`: 全投稿管理 (検索, ステータス/カテゴリフィルター)
   - 投稿アクション: 非表示 / 復元 / 完全削除(super_adminのみ)
   - `AdminCommentsPage.tsx`: コメント管理 (非表示/復元/削除)
   - DB: comments に is_hidden, hidden_by, hidden_at 追加
   - DB: posts に admin_note, hidden_by, hidden_at 追加
5. **Phase 5 — 操作ログ (Audit Log):**
   - `AdminAuditLogPage.tsx`: 全操作ログテーブル (アクション/対象フィルター)
   - 12種類のアクション記録 (post_hide, user_ban, report_resolve, etc.)
   - DB: `admin_audit_logs` テーブル新規作成
6. **権限差別化:**
   - `super_admin`: 全機能アクセス (ユーザー管理, ロール変更, 完全削除, 監査ログ)
   - `school_admin`: 概要, 通報, 投稿/コメント管理のみ (ユーザー管理・ログ閲覧不可)
7. **BAN/コンテンツ非表示通知:**
   - `admin_notifications` テーブル新規作成
   - BAN/UNBAN/投稿非表示/コメント非表示/警告時に対象ユーザーへ通知自動送信
   - ⚠️ `supabase/admin_system.sql` をSupabase Dashboardで実行が必要

