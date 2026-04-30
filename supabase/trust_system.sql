-- ============================================================
-- 🛡️ Trust & Manner Evaluation System
-- ============================================================

-- 1. Extend profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS manner_temp numeric(4,1) DEFAULT 36.5,
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_school_domain text;

-- 2. Extend reviews table with manner tags
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS manner_tags text[] DEFAULT '{}';

-- 3. Manner temperature calculation trigger
CREATE OR REPLACE FUNCTION update_manner_temp()
RETURNS trigger AS $$
DECLARE
  v_current numeric;
  v_delta numeric;
  v_tag_bonus numeric;
  v_new_temp numeric;
BEGIN
  -- Base delta from rating
  v_delta := CASE NEW.rating
    WHEN 5 THEN 0.5
    WHEN 4 THEN 0.3
    WHEN 3 THEN 0.1
    WHEN 2 THEN -0.3
    WHEN 1 THEN -0.5
    ELSE 0
  END;

  -- Manner tag bonus (+0.1 per tag, max +0.3)
  v_tag_bonus := LEAST(COALESCE(array_length(NEW.manner_tags, 1), 0) * 0.1, 0.3);
  v_delta := v_delta + v_tag_bonus;

  -- Get current temp
  SELECT manner_temp INTO v_current
    FROM profiles WHERE id = NEW.to_user_id;

  -- Clamp between 0 and 99
  v_new_temp := GREATEST(0, LEAST(99, COALESCE(v_current, 36.5) + v_delta));

  UPDATE profiles
    SET manner_temp = v_new_temp
    WHERE id = NEW.to_user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_update_temp ON reviews;
CREATE TRIGGER on_review_update_temp
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE PROCEDURE update_manner_temp();

-- 4. RLS for new fields (profiles already has public read + update own)
-- No additional RLS needed since profiles table policies already cover these columns.
