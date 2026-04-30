-- ============================================
-- CampusRelay Chat Realtime Upgrade
-- Supabase Dashboard → SQL Editor에서 실행하세요
-- ============================================

-- 1) Realtime Publication 활성화
-- chat_messages와 chat_rooms 테이블의 실시간 변경 감지를 활성화합니다
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;

-- 2) chat_messages에 is_read 컬럼 추가 (읽음 확인용)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- 3) chat_rooms에 last_message 관련 컬럼 추가 (목록 미리보기용)
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS last_message_text text;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS last_message_at timestamptz;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS unread_count_seller integer DEFAULT 0;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS unread_count_buyer integer DEFAULT 0;

-- 4) 메시지 삽입 시 chat_rooms 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_chat_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms SET
    last_message_text = NEW.text,
    last_message_at = NEW.created_at,
    unread_count_seller = CASE 
      WHEN NEW.sender_id != seller_id THEN unread_count_seller + 1 
      ELSE unread_count_seller 
    END,
    unread_count_buyer = CASE 
      WHEN NEW.sender_id != buyer_id THEN unread_count_buyer + 1 
      ELSE unread_count_buyer 
    END
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거가 있으면 삭제 후 재생성
DROP TRIGGER IF EXISTS on_new_chat_message ON chat_messages;
CREATE TRIGGER on_new_chat_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_room_last_message();

-- 5) 읽음 처리 RLS 정책 추가
-- 기존 정책이 있으면 무시됨
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update read status' AND tablename = 'chat_messages'
  ) THEN
    CREATE POLICY "Users can update read status"
      ON chat_messages FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM chat_rooms
          WHERE chat_rooms.id = chat_messages.room_id
          AND (chat_rooms.seller_id = auth.uid() OR chat_rooms.buyer_id = auth.uid())
        )
      );
  END IF;
END $$;

-- 6) chat_rooms unread count 리셋 RLS 정책
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own chat rooms' AND tablename = 'chat_rooms'
  ) THEN
    CREATE POLICY "Users can update their own chat rooms"
      ON chat_rooms FOR UPDATE
      USING (auth.uid() = seller_id OR auth.uid() = buyer_id);
  END IF;
END $$;

-- 7) 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_message ON chat_rooms(last_message_at DESC NULLS LAST);
