-- 1. Create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Update completed_count on status = Given
CREATE OR REPLACE FUNCTION update_completed_count()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'Given' AND OLD.status != 'Given' THEN
    UPDATE profiles SET completed_count = completed_count + 1 WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_given ON posts;
CREATE TRIGGER on_post_given
  AFTER UPDATE OF status ON posts
  FOR EACH ROW EXECUTE PROCEDURE update_completed_count();

-- 3. Calculate avg_rating on new review
CREATE OR REPLACE FUNCTION update_avg_rating()
RETURNS trigger AS $$
DECLARE
  v_avg numeric;
  v_count int;
BEGIN
  SELECT ROUND(AVG(rating), 2), COUNT(id) INTO v_avg, v_count
  FROM reviews
  WHERE to_user_id = NEW.to_user_id;

  UPDATE profiles
  SET avg_rating = COALESCE(v_avg, 0),
      rating_count = COALESCE(v_count, 0)
  WHERE id = NEW.to_user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_created ON reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE PROCEDURE update_avg_rating();
