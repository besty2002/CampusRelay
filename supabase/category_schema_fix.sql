-- ============================================================
-- Category Schema Fix
-- 프론트엔드에서 사용하는 카테고리와 DB CHECK 제약조건 동기화
-- 기존: 'Uniform', 'Textbook', 'Supplies', 'Other'
-- 변경: 'Uniform', 'Textbook', 'Digital', 'Life', 'ArtSport', 'Other'
-- ============================================================

-- 1. 기존 CHECK 제약조건 삭제
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_category_check;

-- 2. 새로운 CHECK 제약조건 추가 (프론트엔드와 동기화)
ALTER TABLE posts ADD CONSTRAINT posts_category_check 
  CHECK (category IN ('Uniform', 'Textbook', 'Digital', 'Life', 'ArtSport', 'Other'));

-- 3. 기존 'Supplies' 데이터가 있다면 'Life'로 마이그레이션
UPDATE posts SET category = 'Life' WHERE category = 'Supplies';
