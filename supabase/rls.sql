ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_requests ENABLE ROW LEVEL SECURITY;

-- Schools: Viewable by authenticated users
CREATE POLICY "Schools viewable by authenticated" ON schools FOR SELECT TO authenticated USING (true);

-- Profiles: Viewable by all, editable by owner
CREATE POLICY "Profiles viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User Schools: Manage own entries
CREATE POLICY "Users manage own schools" ON user_schools FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Posts: 
-- View: Only if user is part of the same school
CREATE POLICY "View posts from my schools" ON posts FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM user_schools WHERE user_id = auth.uid() AND school_id = posts.school_id));
-- Insert: Must be owner
CREATE POLICY "Create own posts" ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Update: Must be owner
CREATE POLICY "Update own posts" ON posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Post Requests:
-- View: Requester or Post Owner
CREATE POLICY "View related requests" ON post_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR EXISTS (SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid()));
-- Insert: Anyone can request
CREATE POLICY "Make requests" ON post_requests FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
-- Update: Post owner only (for status change)
CREATE POLICY "Manage requests" ON post_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid()));
