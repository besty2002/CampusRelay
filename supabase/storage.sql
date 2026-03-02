-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Public read access
CREATE POLICY "Public read post-images" ON storage.objects FOR SELECT USING (bucket_id = 'post-images');

-- 3. Authenticated users can upload
CREATE POLICY "Auth insert post-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-images');

-- 4. Owners can update or delete their own images
CREATE POLICY "Auth update post-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'post-images' AND auth.uid() = owner);
CREATE POLICY "Auth delete post-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'post-images' AND auth.uid() = owner);
