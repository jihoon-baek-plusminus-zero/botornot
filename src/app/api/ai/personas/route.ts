import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { AIPersona } from '@/types/openai'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const personaId = searchParams.get('id')

    const supabase = createServerClient()

    if (personaId) {
      // 특정 페르소나 조회
      const { data, error } = await supabase
        .from('ai_personas')
        .select('*')
        .eq('id', parseInt(personaId))
        .single()

      if (error || !data) {
        return NextResponse.json({
          success: false,
          error: 'AI 페르소나를 찾을 수 없습니다.'
        }, { status: 404 })
      }

      const persona: AIPersona = {
        id: data.id,
        name: data.name,
        description: data.description,
        personality: data.description,
        speaking_style: data.description.includes('캐주얼') ? 'casual' : 'formal',
        interests: ['일반적인 관심사'],
        background: data.description,
        typo_chance: data.typo_chance,
        meme_chance: data.meme_chance,
        avg_response_time_ms: data.avg_response_time_ms,
        avg_response_length: data.avg_response_length,
        emoji_usage: data.meme_chance,
        formality_level: data.description.includes('캐주얼') ? 'casual' : 'formal'
      }

      return NextResponse.json({
        success: true,
        persona
      })

    } else {
      // 모든 페르소나 조회
      const { data, error } = await supabase
        .from('ai_personas')
        .select('*')
        .order('id')

      if (error) {
        console.error('AI 페르소나 조회 오류:', error)
        return NextResponse.json({
          success: false,
          error: 'AI 페르소나 조회에 실패했습니다.'
        }, { status: 500 })
      }

      const personas: AIPersona[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        personality: item.description,
        speaking_style: item.description.includes('캐주얼') ? 'casual' : 'formal',
        interests: ['일반적인 관심사'],
        background: item.description,
        typo_chance: item.typo_chance,
        meme_chance: item.meme_chance,
        avg_response_time_ms: item.avg_response_time_ms,
        avg_response_length: item.avg_response_length,
        emoji_usage: item.meme_chance,
        formality_level: item.description.includes('캐주얼') ? 'casual' : 'formal'
      }))

      return NextResponse.json({
        success: true,
        personas,
        count: personas.length
      })
    }

  } catch (error) {
    console.error('AI 페르소나 API 오류:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'AI 페르소나 조회 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
