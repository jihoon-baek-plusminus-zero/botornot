-- BotOrNot Database Schema
-- AI vs Human 게임을 위한 데이터베이스 구조

-- 1. 게임 테이블
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_type TEXT NOT NULL CHECK (game_type IN ('1v1', '1vn')),
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'voting', 'finished')),
    topic_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 플레이어 테이블
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_label TEXT NOT NULL CHECK (player_label IN ('A', 'B', 'C', 'D', 'E')),
    player_color TEXT NOT NULL,
    is_ai BOOLEAN NOT NULL DEFAULT FALSE,
    persona_id INTEGER,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'left')),
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    disconnected_at TIMESTAMP WITH TIME ZONE,
    disconnect_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(game_id, player_label)
);

-- 3. 메시지 테이블
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 투표 테이블
CREATE TABLE votes (
    id BIGSERIAL PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    voter_player_label VARCHAR(1) NOT NULL CHECK (voter_player_label IN ('A', 'B', 'C', 'D', 'E')),
    voted_for_players TEXT[] NOT NULL, -- AI 투표를 위해 배열로 변경
    confidence DECIMAL(3,2) DEFAULT 0.5, -- AI 투표 신뢰도
    reasoning TEXT, -- AI 투표 이유
    strategy VARCHAR(50), -- AI 투표 전략
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(game_id, voter_player_label)
);

-- 5. 주제 테이블 (100개의 대화 주제)
CREATE TABLE topics (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. AI 페르소나 테이블 (10개의 AI 페르소나)
CREATE TABLE ai_personas (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    typo_chance DECIMAL(3,2) NOT NULL CHECK (typo_chance >= 0 AND typo_chance <= 1),
    meme_chance DECIMAL(3,2) NOT NULL CHECK (meme_chance >= 0 AND meme_chance <= 1),
    avg_response_time_ms INTEGER NOT NULL CHECK (avg_response_time_ms > 0),
    avg_response_length INTEGER NOT NULL CHECK (avg_response_length > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_game_type ON games(game_type);
CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_players_is_ai ON players(is_ai);
CREATE INDEX idx_messages_game_id ON messages(game_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_votes_game_id ON votes(game_id);
CREATE INDEX idx_votes_voter_player_label ON votes(voter_player_label);

-- 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 업데이트 트리거 적용
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 활성화
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_personas ENABLE ROW LEVEL SECURITY;

-- RLS 정책 (익명 사용자도 읽기 가능, 쓰기는 제한적)
CREATE POLICY "Allow anonymous read access to games" ON games
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read access to players" ON players
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read access to messages" ON messages
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read access to votes" ON votes
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read access to topics" ON topics
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read access to ai_personas" ON ai_personas
    FOR SELECT USING (true);

-- 쓰기 정책 (서비스 롤에서만 가능)
CREATE POLICY "Allow service role full access to games" ON games
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to players" ON players
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to messages" ON messages
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to votes" ON votes
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to topics" ON topics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to ai_personas" ON ai_personas
    FOR ALL USING (auth.role() = 'service_role');

-- 턴 로그 테이블
CREATE TABLE IF NOT EXISTS turn_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  previous_turn VARCHAR(1) CHECK (previous_turn IN ('A', 'B', 'C', 'D', 'E')),
  next_turn VARCHAR(1) NOT NULL CHECK (next_turn IN ('A', 'B', 'C', 'D', 'E')),
  reason VARCHAR(20) NOT NULL CHECK (reason IN ('manual', 'timeout', 'message_sent', 'auto_skip')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 턴 로그 인덱스
CREATE INDEX IF NOT EXISTS idx_turn_logs_game_id ON turn_logs(game_id);
CREATE INDEX IF NOT EXISTS idx_turn_logs_timestamp ON turn_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_turn_logs_reason ON turn_logs(reason);

-- 턴 로그 updated_at 트리거
CREATE OR REPLACE FUNCTION update_turn_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_turn_logs_updated_at
  BEFORE UPDATE ON turn_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_turn_logs_updated_at();

-- 턴 로그 RLS 설정
ALTER TABLE turn_logs ENABLE ROW LEVEL SECURITY;

-- 익명 사용자 읽기 정책
CREATE POLICY "Allow anonymous read access to turn_logs" ON turn_logs
  FOR SELECT USING (true);

-- 서비스 역할 전체 접근 정책
CREATE POLICY "Allow service role full access to turn_logs" ON turn_logs
  FOR ALL USING (auth.role() = 'service_role');

-- 턴 통계 뷰
CREATE OR REPLACE VIEW turn_stats AS
SELECT 
  game_id,
  COUNT(*) as total_turns,
  COUNT(CASE WHEN reason = 'timeout' THEN 1 END) as timeout_count,
  COUNT(CASE WHEN reason = 'message_sent' THEN 1 END) as message_sent_count,
  COUNT(CASE WHEN reason = 'auto_skip' THEN 1 END) as auto_skip_count,
  AVG(EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (PARTITION BY game_id ORDER BY timestamp)))) as avg_turn_duration_seconds,
  MIN(timestamp) as first_turn_time,
  MAX(timestamp) as last_turn_time
FROM turn_logs 
GROUP BY game_id;
