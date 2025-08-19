-- BotOrNot Database Migration
-- votes 테이블에 vote_type 컬럼 추가

-- votes 테이블에 vote_type 컬럼 추가 (1:1 게임에서 AI/Human 선택)
ALTER TABLE votes 
ADD COLUMN IF NOT EXISTS vote_type VARCHAR(10) CHECK (vote_type IN ('ai', 'human'));

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_votes_vote_type ON votes(vote_type);

-- 기존 데이터에 대한 기본값 설정 (1:N 게임의 경우 NULL로 유지)
-- 1:1 게임의 경우 나중에 업데이트 필요
