-- 1. `posts` 테이블에 거래 상태 관리를 위한 `status` 컬럼 추가
-- (이미 존재하는 컬럼일 수도 있으므로 안전하게 처리)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='posts' AND column_name='status') THEN
        ALTER TABLE posts ADD COLUMN status text DEFAULT 'AVAILABLE';
    END IF;
END $$;

-- 2. `chat_messages` 테이블에 사진 전송을 위한 `image_url` 컬럼 추가
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='chat_messages' AND column_name='image_url') THEN
        ALTER TABLE chat_messages ADD COLUMN image_url text;
    END IF;
END $$;

-- 3. Storage 버킷 설정은 Supabase Dashboard(Storage 메뉴)에서 직접 수동으로 생성하는 것을 권장합니다.
-- 생성할 버킷 이름: "chat-images"
-- Public 여부: true (또는 false 후 url 서명 방식 사용)
