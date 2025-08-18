-- BotOrNot Database Migration
-- 누락된 컬럼들을 추가하는 마이그레이션

-- 1. players 테이블에 하트비트 및 연결 해제 관련 컬럼 추가
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS disconnect_reason TEXT;

-- 2. games 테이블에 타이머 관련 컬럼 추가
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS time_remaining INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS turn_time_remaining INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS vote_time_remaining INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS current_turn VARCHAR(1) CHECK (current_turn IN ('A', 'B', 'C', 'D', 'E'));

-- 3. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_players_last_heartbeat ON players(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_players_status ON players(status);
CREATE INDEX IF NOT EXISTS idx_games_current_turn ON games(current_turn);

-- 4. 기존 데이터에 대한 기본값 설정
UPDATE players SET last_heartbeat = created_at WHERE last_heartbeat IS NULL;
UPDATE games SET time_remaining = 120 WHERE time_remaining IS NULL;
UPDATE games SET turn_time_remaining = 10 WHERE turn_time_remaining IS NULL;
UPDATE games SET vote_time_remaining = 10 WHERE vote_time_remaining IS NULL;
