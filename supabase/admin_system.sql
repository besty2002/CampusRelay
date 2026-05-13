-- ============================================================
-- 🛡️ Admin System Migration
-- Phase 2: User Management (BAN support)
-- Phase 3: Reports Enhancement
-- Phase 5: Audit Log
-- ============================================================

-- 1. Extend profiles for BAN support
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS ban_reason text;

-- 2. Extend reports table
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'post'
    CHECK (target_type IN ('post', 'user', 'comment')),
  ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS comment_id uuid REFERENCES comments(id),
  ADD COLUMN IF NOT EXISTS category text
    CHECK (category IN (
      'spam', 'inappropriate', 'harassment',
      'fake', 'prohibited', 'other'
    )),
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_note text;

-- 3. Extend comments for moderation
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

-- 4. Extend posts for admin tracking
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS hidden_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

-- 5. Admin Notifications table (for BAN / content hide notifications)
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('ban', 'unban', 'post_hidden', 'comment_hidden', 'warning')),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own admin_notifications" ON admin_notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users update own admin_notifications" ON admin_notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins insert admin_notifications" ON admin_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  );

-- 6. Audit Log table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id) NOT NULL,
  action text NOT NULL CHECK (action IN (
    'post_hide', 'post_restore', 'post_delete',
    'user_ban', 'user_unban', 'user_role_change',
    'report_resolve', 'report_dismiss',
    'comment_hide', 'comment_delete',
    'verification_grant', 'verification_revoke'
  )),
  target_type text NOT NULL CHECK (target_type IN ('post', 'user', 'comment', 'report')),
  target_id uuid NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read audit logs" ON admin_audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  );

CREATE POLICY "Admin insert audit logs" ON admin_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    admin_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  );

-- 7. Additional RLS: super_admin can update any profile (role, ban)
-- (school_admin cannot change roles)
CREATE POLICY "Super admin update profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 8. Admin can read ALL posts (including Hidden)
CREATE POLICY "Admin read all posts" ON posts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  );

-- 9. Admin can moderate comments
CREATE POLICY "Admin update comments" ON comments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  );

-- 10. school_admin can read reports for their school only (enforced in app layer)
-- super_admin can read all reports (already covered by existing policy)
