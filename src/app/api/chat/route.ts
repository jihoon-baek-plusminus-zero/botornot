import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    // OpenAI API 호출
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '당신은 친근하고 도움이 되는 AI 어시스턴트입니다. 한국어로 대화하며 사용자의 질문에 정확하고 유용한 답변을 제공해주세요.'
          },
          ...messages
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const aiMessage = data.choices[0].message.content

    return NextResponse.json({ 
      message: aiMessage,
      usage: data.usage 
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'AI 응답을 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
