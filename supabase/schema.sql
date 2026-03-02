-- 1. Schools
CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ja text NOT NULL,
  name_ja_lower text NOT NULL,
  type text NOT NULL CHECK (type IN ('elementary', 'middle', 'high')),
  ward_ja text DEFAULT '足立区',
  region_id uuid, -- For Phase 2
  created_at timestamptz DEFAULT now()
);

-- 2. Profiles (with Rating & Roles)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  role text DEFAULT 'user' CHECK (role IN ('user', 'school_admin', 'super_admin')),
  completed_count int DEFAULT 0,
  avg_rating numeric(3, 2) DEFAULT 0,
  rating_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 3. User Schools
CREATE TABLE user_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  UNIQUE(user_id, school_id)
);

-- 4. Posts
CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  region_id uuid,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('GIVEAWAY', 'EXCHANGE')),
  exchange_wanted text,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('Uniform', 'Textbook', 'Supplies', 'Other')),
  condition text NOT NULL CHECK (condition IN ('Like New', 'Good', 'Used')),
  status text DEFAULT 'Available' CHECK (status IN ('Available', 'Reserved', 'Given', 'Hidden')),
  created_at timestamptz DEFAULT now()
);

-- 5. Post Images
CREATE TABLE post_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 6. Post Requests
CREATE TABLE post_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  requester_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, requester_id)
);

-- 7. Reviews (Mutual)
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, from_user_id, to_user_id)
);

-- 8. Reports (Admin Mode)
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Reviewed')),
  created_at timestamptz DEFAULT now()
);
