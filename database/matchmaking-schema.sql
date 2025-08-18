-- 매치메이킹 대기열 엔트리 테이블
CREATE TABLE IF NOT EXISTS queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  player_label VARCHAR(1) NOT NULL CHECK (player_label IN ('A', 'B', 'C', 'D', 'E')),
  queue_type VARCHAR(3) NOT NULL CHECK (queue_type IN ('1v1', '1vn')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled', 'timeout')),
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_queue_entries_queue_type ON queue_entries(queue_type);
CREATE INDEX IF NOT EXISTS idx_queue_entries_status ON queue_entries(status);
CREATE INDEX IF NOT EXISTS idx_queue_entries_joined_at ON queue_entries(joined_at);
CREATE INDEX IF NOT EXISTS idx_queue_entries_player_id ON queue_entries(player_id);

-- updated_at 트리거
CREATE OR REPLACE FUNCTION update_queue_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_queue_entries_updated_at
  BEFORE UPDATE ON queue_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_queue_entries_updated_at();

-- Row Level Security (RLS) 설정
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;

-- 익명 사용자 읽기 정책
CREATE POLICY "Allow anonymous read access to queue_entries" ON queue_entries
  FOR SELECT USING (true);

-- 서비스 역할 전체 접근 정책
CREATE POLICY "Allow service role full access to queue_entries" ON queue_entries
  FOR ALL USING (auth.role() = 'service_role');

-- 매치메이킹 통계 뷰
CREATE OR REPLACE VIEW queue_stats AS
SELECT 
  queue_type,
  COUNT(*) as waiting_players,
  AVG(EXTRACT(EPOCH FROM (NOW() - joined_at))) as avg_wait_time_seconds,
  MIN(EXTRACT(EPOCH FROM (NOW() - joined_at))) as min_wait_time_seconds,
  MAX(EXTRACT(EPOCH FROM (NOW() - joined_at))) as max_wait_time_seconds
FROM queue_entries 
WHERE status = 'waiting'
GROUP BY queue_type;

-- 오래된 대기열 엔트리 정리 함수
CREATE OR REPLACE FUNCTION cleanup_old_queue_entries()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM queue_entries 
  WHERE status = 'waiting' 
    AND joined_at < NOW() - INTERVAL '10 minutes';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 매치메이킹 성공률 통계 뷰
CREATE OR REPLACE VIEW matchmaking_stats AS
SELECT 
  queue_type,
  COUNT(*) as total_entries,
  COUNT(CASE WHEN status = 'matched' THEN 1 END) as matched_count,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
  COUNT(CASE WHEN status = 'timeout' THEN 1 END) as timeout_count,
  ROUND(
    COUNT(CASE WHEN status = 'matched' THEN 1 END)::DECIMAL / COUNT(*) * 100, 
    2
  ) as success_rate_percent
FROM queue_entries 
WHERE joined_at >= NOW() - INTERVAL '24 hours'
GROUP BY queue_type;
