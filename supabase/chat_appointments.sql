-- ============================================================
-- Chat Appointments Migration
-- chat_messages 테이블에 약속 정보 저장을 위한 appointment_data 컬럼 추가
-- ============================================================

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS appointment_data jsonb;
