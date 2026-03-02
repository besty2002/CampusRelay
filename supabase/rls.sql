ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Schools: public read
CREATE POLICY "Public read schools" ON schools FOR SELECT USING (true);

-- Profiles: public read, update own
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User Schools: Manage own
CREATE POLICY "Manage own user_schools" ON user_schools FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Posts: Public read (Available, Reserved, Given), but only school_admin can see Hidden? For simplicity public read all for now.
CREATE POLICY "Public read posts" ON posts FOR SELECT USING (status != 'Hidden' OR auth.uid() = user_id);
CREATE POLICY "Insert own posts" ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own posts" ON posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Post Images: Public read, insert by post owner
CREATE POLICY "Public read post_images" ON post_images FOR SELECT USING (true);
CREATE POLICY "Insert post_images" ON post_images FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid()));
CREATE POLICY "Delete post_images" ON post_images FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid()));

-- Post Requests: 
-- Read: Requester or Post Owner
CREATE POLICY "Read post_requests" ON post_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR EXISTS (SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid()));
-- Insert: Any authenticated
CREATE POLICY "Insert post_requests" ON post_requests FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
-- Update: Post Owner
CREATE POLICY "Update post_requests" ON post_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid()));

-- Reviews: Public read
CREATE POLICY "Public read reviews" ON reviews FOR SELECT USING (true);
-- Insert: Auth users who were involved in the post (status Given)
CREATE POLICY "Insert reviews" ON reviews FOR INSERT TO authenticated WITH CHECK (
  from_user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM posts p
    LEFT JOIN post_requests pr ON pr.post_id = p.id AND pr.status = 'Approved'
    WHERE p.id = post_id AND p.status = 'Given' AND
    (auth.uid() = p.user_id OR auth.uid() = pr.requester_id)
  )
);

-- Reports: Auth users can insert
CREATE POLICY "Insert reports" ON reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
-- Admin read/update reports
CREATE POLICY "Admin read reports" ON reports FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('school_admin', 'super_admin'))
);
CREATE POLICY "Admin update reports" ON reports FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('school_admin', 'super_admin'))
);
