-- ============================================================
-- 🛡️ Admin Invitation System
-- ============================================================

-- 1. Create admin_invites table
CREATE TABLE IF NOT EXISTS admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('school_admin', 'super_admin')),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE admin_invites ENABLE ROW LEVEL SECURITY;

-- Super admins can manage invites
CREATE POLICY "Super admins manage invites" ON admin_invites
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 2. Create Security Definer RPC for redeeming invites
-- This bypasses RLS so a new user can update their own role
CREATE OR REPLACE FUNCTION redeem_admin_invite(invite_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
  v_uid uuid;
BEGIN
  -- Get current user ID
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find valid invite
  SELECT * INTO v_invite
  FROM admin_invites
  WHERE code = invite_code
    AND used_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  -- Update user profile role
  UPDATE profiles
  SET role = v_invite.role
  WHERE id = v_uid;

  -- If school_admin and school_id is set, add to user_schools
  IF v_invite.role = 'school_admin' AND v_invite.school_id IS NOT NULL THEN
    INSERT INTO user_schools (user_id, school_id)
    VALUES (v_uid, v_invite.school_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Mark invite as used
  UPDATE admin_invites
  SET used_at = now(), used_by = v_uid
  WHERE id = v_invite.id;

  -- Log action
  INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (v_uid, 'user_role_change', 'user', v_uid, jsonb_build_object('method', 'invite_code', 'code', invite_code, 'role', v_invite.role));

  RETURN true;
END;
$$;

-- 3. Initial Setup Query (Run this manually in Supabase SQL Editor to make yourself super_admin)
/*
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'YOUR_EMAIL@example.com'; -- Replace with your actual email if profiles has email, or use ID
*/
