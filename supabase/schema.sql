-- 1. Schools Table
CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ja text NOT NULL,
  name_ja_lower text NOT NULL,
  type text NOT NULL CHECK (type IN ('elementary', 'middle', 'high')),
  ward_ja text DEFAULT '足立区',
  created_at timestamptz DEFAULT now()
);

-- 2. Profiles Table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  role text DEFAULT 'user',
  completed_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Auth 회원가입 시 Profile 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. User Schools
CREATE TABLE user_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  UNIQUE(user_id, school_id)
);

-- 4. Posts Table
CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('GIVEAWAY', 'EXCHANGE')),
  exchange_wanted text,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('Uniform', 'Textbook', 'Supplies', 'Other')),
  condition text NOT NULL CHECK (condition IN ('Like New', 'Good', 'Used')),
  status text DEFAULT 'Available' CHECK (status IN ('Available', 'Reserved', 'Given')),
  created_at timestamptz DEFAULT now()
);

-- 5. Post Requests Table
CREATE TABLE post_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  requester_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, requester_id)
);

-- 신뢰도 시스템: 상태가 Given으로 변경될 때 작성자의 completed_count 증가
CREATE OR REPLACE FUNCTION update_completed_count()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'Given' AND OLD.status != 'Given' THEN
    UPDATE profiles SET completed_count = completed_count + 1 WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_post_given
  AFTER UPDATE OF status ON posts
  FOR EACH ROW EXECUTE PROCEDURE update_completed_count();
