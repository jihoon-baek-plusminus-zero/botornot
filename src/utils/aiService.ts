export interface AIResponse {
  success: boolean
  message?: string
  error?: string
}

export class AIService {
  private apiKey: string
  private apiUrl: string

  constructor() {
    // 환경변수에서 API 키와 URL 가져오기
    this.apiKey = process.env.OPENAI_API_KEY || ''
    this.apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions'
  }

  async generateResponse(context: string): Promise<AIResponse> {
    try {
      // 실제 AI API 호출 (현재는 모의 응답)
      const response = await this.callAIAPI(context)
      return {
        success: true,
        message: response
      }
    } catch (error) {
      console.error('AI API 호출 오류:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AI 응답 생성 실패'
      }
    }
  }

  private async callAIAPI(context: string): Promise<string> {
    // 실제 구현에서는 OpenAI API나 다른 AI 서비스 호출
    // 현재는 개발용 모의 응답
    
    if (!this.apiKey) {
      // API 키가 없으면 모의 응답 반환
      return this.generateMockResponse(context)
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: context
            }
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`)
      }

      const data = await response.json()
      return data.choices[0].message.content.trim()
    } catch (error) {
      console.error('AI API 호출 중 오류:', error)
      // API 호출 실패 시 모의 응답 반환
      return this.generateMockResponse(context)
    }
  }

  private generateMockResponse(context: string): string {
    // 개발용 모의 응답 생성
    const mockResponses = [
      '네, 그렇습니다!',
      '흥미로운 이야기네요.',
      '저도 그렇게 생각해요.',
      '정말요? 놀랍네요!',
      '그런 일이 있었군요.',
      '좋은 지적이에요.',
      '저는 조금 다르게 생각해요.',
      '맞습니다, 그럴 수 있겠네요.',
      '정말 흥미롭습니다!',
      '저도 비슷한 경험이 있어요.'
    ]

    // 컨텍스트에서 플레이어 이름 추출
    const playerMatch = context.match(/당신은 (Player [A-E]) 입니다/)
    const playerName = playerMatch ? playerMatch[1] : 'Player'
    
    const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)]
    return `${playerName}: ${randomResponse}`
  }
}

// 싱글톤 인스턴스
export const aiService = new AIService()
