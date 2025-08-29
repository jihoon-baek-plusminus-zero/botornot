-- 1:1 게임 매칭 대기열
CREATE TABLE matchmaking_queue_1v1 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  game_id UUID REFERENCES games(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 게임 테이블
CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_type TEXT NOT NULL CHECK (game_type IN ('1v1', '1vN')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'finished', 'cancelled')),
  topic TEXT DEFAULT '일상적인 대화',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '2 minutes'),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 플레이어 테이블
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  session_id TEXT,
  player_label TEXT NOT NULL CHECK (player_label IN ('Player 1', 'Player 2')),
  player_color TEXT DEFAULT '#3B82F6',
  is_ai BOOLEAN DEFAULT FALSE,
  turn_order INTEGER NOT NULL, -- 1 또는 2 (1이 먼저 시작)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'left', 'disconnected')),
  voted_intention BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 메시지 테이블
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 투표 테이블
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  voted_for TEXT NOT NULL CHECK (voted_for IN ('AI', 'Human')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 시스템 설정 테이블
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 초기 시스템 설정
INSERT INTO system_config (key, value) VALUES 
('last_match_type', 'ai'),
('match_counter', '0');

-- 인덱스 생성
CREATE INDEX idx_matchmaking_queue_status ON matchmaking_queue_1v1(status);
CREATE INDEX idx_matchmaking_queue_joined_at ON matchmaking_queue_1v1(joined_at);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_expires_at ON games(expires_at);
CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_messages_game_id ON messages(game_id);
CREATE INDEX idx_votes_game_id ON votes(game_id);

-- RLS (Row Level Security) 설정
ALTER TABLE matchmaking_queue_1v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- 모든 테이블에 대한 읽기/쓰기 정책 (개발 단계에서는 모든 접근 허용)
CREATE POLICY "Allow all operations" ON matchmaking_queue_1v1 FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON games FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON players FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON messages FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON votes FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON system_config FOR ALL USING (true);
