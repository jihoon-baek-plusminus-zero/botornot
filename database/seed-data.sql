-- BotOrNot Seed Data
-- 초기 데이터 삽입

-- 1. 대화 주제 데이터 (2개 샘플)
INSERT INTO topics (content) VALUES
('오늘 날씨가 정말 좋네요!'),
('최근에 본 영화나 드라마가 있나요?');

-- 2. AI 페르소나 데이터 (2개 샘플)
INSERT INTO ai_personas (name, description, typo_chance, meme_chance, avg_response_time_ms, avg_response_length) VALUES
('캐주얼한 대학생', '친근하고 편안한 대화를 선호하는 대학생 페르소나. 가끔 오타를 내고 인터넷 밈을 사용한다.', 0.15, 0.25, 3000, 50),
('신중한 직장인', '조심스럽고 신중한 응답을 하는 직장인 페르소나. 오타가 거의 없고 정중한 대화를 한다.', 0.05, 0.10, 5000, 80);
