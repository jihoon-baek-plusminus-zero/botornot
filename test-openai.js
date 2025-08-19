const OpenAI = require('openai');

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
  try {
    console.log('🔍 OpenAI API 테스트 시작...');
    console.log('API Key 확인:', process.env.OPENAI_API_KEY ? '설정됨' : '설정되지 않음');
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY가 설정되지 않았습니다.');
      return;
    }

    const testPrompt = `당신은 AI vs Human 게임에서 AI 플레이어 역할을 합니다. 자연스럽고 인간다운 응답을 생성해주세요.

게임 정보:
- 주제: 오늘 날씨가 정말 좋네요!
- 게임 타입: 1v1
- 대화 히스토리: A: 안녕하세요! 오늘 날씨가 정말 좋네요. 뭐 하고 계세요?

응답은 자연스럽고 casual한 톤으로 해주세요. 100자 이내로 답변해주세요.`;

    console.log('📝 테스트 프롬프트:');
    console.log(testPrompt);
    console.log('\n🚀 OpenAI API 호출 중...');

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: '당신은 AI vs Human 게임에서 AI 플레이어 역할을 합니다. 자연스럽고 인간다운 응답을 생성해주세요.'
        },
        {
          role: 'user',
          content: testPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    console.log('✅ OpenAI API 응답 성공!');
    console.log('📊 응답 정보:');
    console.log('- 모델:', response.model);
    console.log('- 사용량:', response.usage);
    console.log('- 선택지 수:', response.choices?.length);
    
    if (response.choices && response.choices.length > 0) {
      const content = response.choices[0].message.content;
      console.log('\n💬 AI 응답:');
      console.log(content);
      
      console.log('\n🔍 응답 분석:');
      console.log('- 길이:', content.length);
      console.log('- 특수문자 포함:', /[^\w\s가-힣.,!?;:'"()-]/.test(content));
      console.log('- 제어문자 포함:', /[\x00-\x1F\x7F-\x9F]/.test(content));
      
      // 안전한 문자열로 변환 테스트
      const cleanedContent = content
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .replace(/[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7A3\uFF00-\uFFEF\w\s.,!?;:'"()-]/g, '')
        .trim();
      
      console.log('\n🧹 정리된 응답:');
      console.log(cleanedContent);
      console.log('- 정리 후 길이:', cleanedContent.length);
    }

  } catch (error) {
    console.error('❌ OpenAI API 테스트 실패:');
    console.error('오류 타입:', error.constructor.name);
    console.error('오류 메시지:', error.message);
    console.error('오류 코드:', error.code);
    console.error('스택 트레이스:', error.stack);
  }
}

// 테스트 실행
testOpenAI();
