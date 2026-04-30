-- 1. 버킷을 Public으로 설정 (누구나 서명 없이 이미지 URL로 조회 가능하게 함)
UPDATE storage.buckets SET public = true WHERE id = 'chat-images';

-- 2. 누구나 이미지를 조회(SELECT)할 수 있도록 허용하는 정책
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'chat-images' );

-- 3. 로그인한 유저(authenticated)만 이미지를 업로드(INSERT)할 수 있도록 허용하는 정책
CREATE POLICY "Auth Users Upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'chat-images' AND auth.role() = 'authenticated' );

-- 4. 본인이 올린 이미지만 수정(UPDATE)할 수 있도록 허용하는 정책
CREATE POLICY "Auth Users Update" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'chat-images' AND auth.uid() = owner );

-- 5. 본인이 올린 이미지만 삭제(DELETE)할 수 있도록 허용하는 정책
CREATE POLICY "Auth Users Delete" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'chat-images' AND auth.uid() = owner );
