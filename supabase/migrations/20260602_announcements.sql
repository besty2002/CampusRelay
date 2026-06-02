CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  show_as_popup boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT announcements_window_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_announcements_updated_at ON public.announcements;
CREATE TRIGGER set_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active announcements" ON public.announcements;
CREATE POLICY "Public read active announcements"
  ON public.announcements
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

DROP POLICY IF EXISTS "Super admin read all announcements" ON public.announcements;
CREATE POLICY "Super admin read all announcements"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super admin insert announcements" ON public.announcements;
CREATE POLICY "Super admin insert announcements"
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super admin update announcements" ON public.announcements;
CREATE POLICY "Super admin update announcements"
  ON public.announcements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super admin delete announcements" ON public.announcements;
CREATE POLICY "Super admin delete announcements"
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'admin_audit_logs'
      AND constraint_name = 'admin_audit_logs_action_check'
  ) THEN
    ALTER TABLE public.admin_audit_logs DROP CONSTRAINT admin_audit_logs_action_check;
  END IF;
END $$;

ALTER TABLE public.admin_audit_logs
  ADD CONSTRAINT admin_audit_logs_action_check
  CHECK (
    action IN (
      'post_hide', 'post_restore', 'post_delete',
      'user_ban', 'user_unban', 'user_role_change',
      'report_resolve', 'report_dismiss',
      'comment_hide', 'comment_delete',
      'verification_grant', 'verification_revoke',
      'announcement_create', 'announcement_update', 'announcement_delete'
    )
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'admin_audit_logs'
      AND constraint_name = 'admin_audit_logs_target_type_check'
  ) THEN
    ALTER TABLE public.admin_audit_logs DROP CONSTRAINT admin_audit_logs_target_type_check;
  END IF;
END $$;

ALTER TABLE public.admin_audit_logs
  ADD CONSTRAINT admin_audit_logs_target_type_check
  CHECK (target_type IN ('post', 'user', 'comment', 'report', 'system'));
