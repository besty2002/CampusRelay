-- ============================================================
-- Avatar System Migration
-- profiles 테이블에 avatar_url 컬럼 추가
-- Supabase Storage에 avatars 버킷 생성 필요
-- ============================================================

-- 1. profiles 테이블에 avatar_url 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Supabase Dashboard → Storage에서 'avatars' 버킷을 Public으로 생성
-- 아래는 Storage Policies (Supabase Dashboard의 Storage Policies 탭에서 설정)
-- ※ SQL로 직접 설정이 안 되는 경우 Dashboard에서 수동 설정 필요:
--   - SELECT (read): Everyone (public)
--   - INSERT: Authenticated users, path matches auth.uid()/*
--   - UPDATE: Authenticated users, path matches auth.uid()/*
--   - DELETE: Authenticated users, path matches auth.uid()/*
