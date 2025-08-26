import {
  AITurnRequest,
  AITurnResponse,
  AIVoteDecisionRequest,
  AIVoteDecisionResponse,
  AIMessageGenerationRequest,
  AIMessageGenerationResponse,
  AITurnContext,
  AITurnConfig,
  AITurnStatus,
  AITurnStats,
  AITurnEvent,
  AITurnLog
} from '@/types/ai-turn'
import { PlayerLabel, GameType } from '@/types/game'
import { AIPersona } from '@/types/openai'
import { generateAIResponse } from './openai'
import { createServerClient } from './supabase'
import { generateId } from './utils'

// AI 턴 처리 설정
const DEFAULT_TURN_CONFIG: AITurnConfig = {
  minConversationLength: 3, // 최소 3개 메시지
  maxWaitTime: 8000, // 최대 8초 대기
  voteThreshold: 0.7, // 70% 이상 확신할 때 투표
  skipThreshold: 0.3, // 30% 이하 확신할 때 스킵
  responseTimeLimit: 5000, // 5초 응답 제한
  qualityThreshold: 0.6 // 60% 이상 품질
}

// AI 턴 처리 통계
let aiTurnStats: AITurnStats = {
  totalTurns: 0,
  successfulTurns: 0,
  failedTurns: 0,
  averageProcessingTime: 0,
  voteDecisions: {
    total: 0,
    voted: 0,
    skipped: 0
  },
  messageGenerations: {
    total: 0,
    generated: 0,
    skipped: 0
  },
  personaUsage: {},
  errorRates: {},
  qualityMetrics: {
    averageVoteConfidence: 0,
    averageMessageQuality: 0,
    averageResponseTime: 0
  }
}

// AI 턴 처리 로그
const turnLogs: Map<string, AITurnLog> = new Map()

/**
 * AI 턴 처리 메인 함수
 */
export async function handleAITurn(request: AITurnRequest): Promise<AITurnResponse> {
  const startTime = Date.now()
  const turnId = generateId()
  
  try {
    // 통계 업데이트
    aiTurnStats.totalTurns++
    aiTurnStats.personaUsage[request.personaId] = (aiTurnStats.personaUsage[request.personaId] || 0) + 1

    // AI 페르소나 조회 (기본 페르소나 제공)
    const persona = await getAIPersona(request.personaId)
    if (!persona) {
      throw new Error(`AI 페르소나를 찾을 수 없습니다: ${request.personaId}`)
    }

    // 턴 컨텍스트 생성
    const context: AITurnContext = {
      gameId: request.gameId,
      playerLabel: request.playerLabel,
      persona,
      gameType: request.gameType,
      conversationHistory: request.conversationHistory,
      currentTopic: request.currentTopic,
      turnTimeRemaining: request.turnTimeRemaining,
      timeRemaining: request.timeRemaining,
      voteCount: request.voteCount,
      totalPlayers: request.totalPlayers,
      players: request.players,
      gameStatus: request.gameStatus
    }

    // 1단계: 투표 결정
    const voteDecision = await decideVote(context)
    
    // 2단계: 메시지 생성 (투표하지 않을 경우)
    let messageGeneration: AIMessageGenerationResponse | undefined
    
    if (!voteDecision.shouldVote) {
      messageGeneration = await generateMessage(context, voteDecision)
    }

    // 턴 완료
    const totalProcessingTime = Date.now() - startTime
    aiTurnStats.successfulTurns++
    aiTurnStats.averageProcessingTime = (aiTurnStats.averageProcessingTime + totalProcessingTime) / 2

    // 통계 업데이트
    if (voteDecision.shouldVote) {
      aiTurnStats.voteDecisions.voted++
    } else {
      aiTurnStats.voteDecisions.skipped++
    }
    aiTurnStats.voteDecisions.total++

    if (messageGeneration?.message) {
      aiTurnStats.messageGenerations.generated++
    } else if (messageGeneration?.shouldSkip) {
      aiTurnStats.messageGenerations.skipped++
    }
    aiTurnStats.messageGenerations.total++

    // 품질 메트릭 업데이트
    aiTurnStats.qualityMetrics.averageVoteConfidence = 
      (aiTurnStats.qualityMetrics.averageVoteConfidence + voteDecision.confidence) / 2
    
    if (messageGeneration?.metadata?.quality) {
      aiTurnStats.qualityMetrics.averageMessageQuality = 
        (aiTurnStats.qualityMetrics.averageMessageQuality + messageGeneration.metadata.quality) / 2
    }

    aiTurnStats.qualityMetrics.averageResponseTime = 
      (aiTurnStats.qualityMetrics.averageResponseTime + totalProcessingTime) / 2

    // 턴 로그 저장
    const turnLog: AITurnLog = {
      id: turnId,
      gameId: request.gameId,
      playerLabel: request.playerLabel,
      personaId: request.personaId,
      turnStatus: 'completed',
      processingTime: totalProcessingTime,
      voteDecision,
      messageGeneration,
      timestamp: new Date().toISOString(),
      metadata: {
        config: DEFAULT_TURN_CONFIG,
        context: {
          gameType: request.gameType,
          gameStatus: request.gameStatus,
          conversationLength: request.conversationHistory.length,
          timeRemaining: request.timeRemaining
        }
      }
    }
    turnLogs.set(turnId, turnLog)

    // 액션 목록 생성
    const actions = []
    if (voteDecision.shouldVote) {
      actions.push({
        type: 'vote' as const,
        data: { reason: voteDecision.reason, confidence: voteDecision.confidence },
        timestamp: new Date().toISOString()
      })
    } else if (messageGeneration?.message) {
      actions.push({
        type: 'message' as const,
        content: messageGeneration.message, // 메시지 내용을 content로 변경
        timestamp: new Date().toISOString()
      })
    } else if (messageGeneration?.shouldSkip) {
      actions.push({
        type: 'skip' as const,
        data: { reason: messageGeneration.reason },
        timestamp: new Date().toISOString()
      })
    }

    return {
      success: true,
      turnStatus: 'completed',
      voteDecision,
      messageGeneration,
      actions,
      metadata: {
        totalProcessingTime,
        personaId: request.personaId,
        playerLabel: request.playerLabel,
        gameId: request.gameId
      }
    }

  } catch (error) {
    // 에러 처리
    const totalProcessingTime = Date.now() - startTime
    aiTurnStats.failedTurns++
    const errorType = error instanceof Error ? error.constructor.name : 'Unknown'
    aiTurnStats.errorRates[errorType] = (aiTurnStats.errorRates[errorType] || 0) + 1

    console.error('AI 턴 처리 오류:', error)

    // 에러 로그 저장
    const errorLog: AITurnLog = {
      id: turnId,
      gameId: request.gameId,
      playerLabel: request.playerLabel,
      personaId: request.personaId,
      turnStatus: 'error',
      processingTime: totalProcessingTime,
      error: error instanceof Error ? error.message : 'AI 턴 처리 중 오류가 발생했습니다.',
      timestamp: new Date().toISOString()
    }
    turnLogs.set(turnId, errorLog)

    return {
      success: false,
      turnStatus: 'error',
      actions: [],
      metadata: {
        totalProcessingTime,
        personaId: request.personaId,
        playerLabel: request.playerLabel,
        gameId: request.gameId
      },
      error: error instanceof Error ? error.message : 'AI 턴 처리 중 오류가 발생했습니다.'
    }
  }
}

/**
 * 1단계: 투표 결정
 */
async function decideVote(context: AITurnContext): Promise<AIVoteDecisionResponse> {
  try {
    // 게임 상태 확인
    if (context.gameStatus === 'finished') {
      return {
        success: true,
        shouldVote: false,
        reason: '게임이 이미 종료되었습니다.',
        confidence: 1.0
      }
    }

    // 투표 가능 여부 확인
    if (context.voteCount >= context.totalPlayers) {
      return {
        success: true,
        shouldVote: false,
        reason: '모든 플레이어가 이미 투표했습니다.',
        confidence: 1.0
      }
    }

    // 대화 길이 확인
    if (context.conversationHistory.length < DEFAULT_TURN_CONFIG.minConversationLength) {
      return {
        success: true,
        shouldVote: false,
        reason: '대화가 충분하지 않습니다.',
        confidence: 0.8
      }
    }

    // 시간 압박 확인
    const timePressure = Math.max(0, 1 - (context.timeRemaining / 120)) // 2분 기준
    if (timePressure > 0.8) {
      return {
        success: true,
        shouldVote: true,
        reason: '시간이 얼마 남지 않아 투표합니다.',
        confidence: 0.9,
        analysis: {
          gameProgress: 0.9,
          conversationQuality: 0.7,
          timePressure: timePressure,
          playerBehavior: 'time_pressure'
        }
      }
    }

    // AI를 사용한 투표 결정
    console.log('Generating AI vote decision...')
    
    const votePrompt = generateVoteDecisionPrompt(context)
    
    try {
      const aiResponse = await generateAIResponse({
        gameId: context.gameId,
        playerLabel: context.playerLabel,
        personaId: context.persona.id,
        conversationHistory: context.conversationHistory,
        currentTopic: context.currentTopic,
        gameType: context.gameType,
        processingOptions: {
          temperature: 0.3,
          maxTokens: 200,
          enablePostProcessing: false
        }
      })

      if (!aiResponse.success) {
        throw new Error(aiResponse.error || 'AI 응답 생성 실패')
      }

      // AI 응답 파싱
      const decision = parseVoteDecision(aiResponse.processedResponse, context)
      
      console.log('AI Vote decision:', decision)
      
      return {
        success: true,
        shouldVote: decision.shouldVote,
        reason: decision.reason,
        confidence: decision.confidence,
        analysis: {
          gameProgress: calculateGameProgress(context),
          conversationQuality: calculateConversationQuality(context),
          timePressure: timePressure,
          playerBehavior: analyzePlayerBehavior(context)
        }
      }
    } catch (error) {
      console.error('AI 투표 결정 오류:', error)
      
      // AI 실패 시 기본 규칙 기반 결정
      let shouldVote = false
      let reason = '더 대화를 이어가겠습니다.'
      let confidence = 0.7
      
      if (timePressure > 0.8) {
        shouldVote = true
        reason = '시간이 얼마 남지 않아 투표합니다.'
        confidence = 0.9
      } else if (context.conversationHistory.length >= 10) {
        shouldVote = true
        reason = '충분한 대화가 이루어져 투표합니다.'
        confidence = 0.8
      } else if (context.voteCount > 0) {
        shouldVote = true
        reason = '다른 플레이어가 투표했으므로 투표합니다.'
        confidence = 0.85
      }
      
      console.log('Fallback vote decision:', { shouldVote, reason, confidence })
      
      return {
        success: true,
        shouldVote,
        reason,
        confidence,
        analysis: {
          gameProgress: context.conversationHistory.length / 20,
          conversationQuality: 0.7,
          timePressure: timePressure,
          playerBehavior: shouldVote ? 'voting' : 'continuing'
        }
      }
    }

    // AI 응답 파싱
    const decision = parseVoteDecision(aiResponse.processedResponse, context)
    
    return {
      success: true,
      shouldVote: decision.shouldVote,
      reason: decision.reason,
      confidence: decision.confidence,
      analysis: {
        gameProgress: calculateGameProgress(context),
        conversationQuality: calculateConversationQuality(context),
        timePressure: timePressure,
        playerBehavior: analyzePlayerBehavior(context)
      }
    }

  } catch (error) {
    console.error('투표 결정 오류:', error)
    
    // 기본값 반환
    return {
      success: false,
      shouldVote: false,
      reason: '투표 결정 중 오류가 발생했습니다.',
      confidence: 0.5,
      error: error instanceof Error ? error.message : '투표 결정 중 오류가 발생했습니다.'
    }
  }
}

/**
 * 2단계: 메시지 생성
 */
async function generateMessage(
  context: AITurnContext, 
  voteDecision: AIVoteDecisionResponse
): Promise<AIMessageGenerationResponse> {
  try {
    // 스킵 조건 확인
    if (voteDecision.confidence < DEFAULT_TURN_CONFIG.skipThreshold) {
      return {
        success: true,
        shouldSkip: true,
        reason: '확신도가 낮아 메시지를 스킵합니다.',
        metadata: {
          responseTime: 0,
          tokenUsage: 0,
          quality: voteDecision.confidence
        }
      }
    }

    // AI를 사용한 메시지 생성
    console.log('Generating AI message...')
    
    try {
      const aiResponse = await generateAIResponse({
        gameId: context.gameId,
        playerLabel: context.playerLabel,
        personaId: context.persona.id,
        conversationHistory: context.conversationHistory,
        currentTopic: context.currentTopic,
        gameType: context.gameType,
        processingOptions: {
          temperature: 0.7,
          maxTokens: 150,
          enablePostProcessing: true
        }
      })

      if (!aiResponse.success) {
        throw new Error(aiResponse.error || 'AI 응답 생성 실패')
      }

      console.log('Generated AI message:', aiResponse.processedResponse)
      
      return {
        success: true,
        message: aiResponse.processedResponse,
        metadata: {
          responseTime: aiResponse.metadata?.responseTime || 0,
          tokenUsage: aiResponse.metadata?.tokenUsage || 0,
          quality: aiResponse.metadata?.quality || 0.8
        }
      }
    } catch (error) {
      console.error('AI 메시지 생성 오류:', error)
      
      // AI 실패 시 기본 메시지 제공
      const fallbackMessages = [
        '안녕하세요! 오늘 날씨가 정말 좋네요. 뭐 하고 계세요?',
        '반갑습니다! 오늘 하루는 어땠나요?',
        '안녕하세요! 재미있는 이야기 해주세요.',
        '오늘 기분이 어떠세요?',
        '안녕하세요! 뭐 하고 계시나요?'
      ]
      
      const randomIndex = Math.floor(Math.random() * fallbackMessages.length)
      const fallbackMessage = fallbackMessages[randomIndex]
      
      console.log('Generated fallback message:', fallbackMessage)
      
      return {
        success: true,
        message: fallbackMessage,
        metadata: {
          responseTime: 0,
          tokenUsage: 0,
          quality: 0.5
        }
      }
    }

  } catch (error) {
    console.error('메시지 생성 오류:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // 오류 발생 시에도 기본 메시지 제공
    const fallbackMessages = [
      '안녕하세요! 오늘 날씨가 정말 좋네요. 뭐 하고 계세요?',
      '반갑습니다! 오늘 하루는 어땠나요?',
      '안녕하세요! 재미있는 이야기 해주세요.',
      '오늘 기분이 어떠세요?',
      '안녕하세요! 뭐 하고 계시나요?'
    ]
    
    const randomIndex = Math.floor(Math.random() * fallbackMessages.length)
    const fallbackMessage = fallbackMessages[randomIndex]
    
    return {
      success: true,
      message: fallbackMessage,
      metadata: {
        responseTime: 0,
        tokenUsage: 0,
        quality: 0.5
      }
    }
  }
}

/**
 * 투표 결정 프롬프트 생성
 */
function generateVoteDecisionPrompt(context: AITurnContext): string {
  const { persona, gameType, conversationHistory, currentTopic, timeRemaining, voteCount, totalPlayers } = context
  
  const historyText = conversationHistory
    .map(msg => {
      // msg가 객체인지 확인하고 안전하게 처리
      if (typeof msg === 'object' && msg !== null) {
        const playerLabel = 'playerLabel' in msg ? String(msg.playerLabel || 'Unknown') : 'Unknown'
        const content = 'content' in msg ? String(msg.content || '') : ''
        
        // 안전한 문자열로 변환
        const safePlayerLabel = playerLabel.replace(/[^\w\s가-힣]/g, '')
        const safeContent = content.replace(/[^\w\s가-힣.,!?;:'"()-]/g, '')
        
        return `${safePlayerLabel}: ${safeContent}`
      }
      return 'Unknown: Invalid message format'
    })
    .join('\n')

  return `당신은 AI vs Human 게임에서 ${persona.name} 역할을 하고 있습니다.

게임 정보:
- 게임 타입: ${gameType}
- 현재 주제: ${currentTopic}
- 남은 시간: ${timeRemaining}초
- 투표한 플레이어: ${voteCount}/${totalPlayers}
- 대화 길이: ${conversationHistory.length}개 메시지

대화 히스토리:
${historyText}

이제 투표할지 결정해야 합니다. 다음 중 하나로 답변해주세요:

1. "VOTE: [이유]" - 충분한 정보가 있어 투표하겠다
2. "CONTINUE: [이유]" - 더 대화를 이어가겠다

답변 형식: "VOTE: 시간이 얼마 남지 않아 투표합니다" 또는 "CONTINUE: 더 많은 정보가 필요합니다"

${persona.name}의 특성에 맞게 결정해주세요.`
}

/**
 * 메시지 생성 프롬프트 생성
 */
function generateMessagePrompt(context: AITurnContext, voteDecision: AIVoteDecisionResponse): string {
  const { persona, gameType, conversationHistory, currentTopic, turnTimeRemaining } = context
  
  const historyText = conversationHistory
    .map(msg => {
      // msg가 객체인지 확인하고 안전하게 처리
      if (typeof msg === 'object' && msg !== null) {
        const playerLabel = 'playerLabel' in msg ? String(msg.playerLabel || 'Unknown') : 'Unknown'
        const content = 'content' in msg ? String(msg.content || '') : ''
        
        // 안전한 문자열로 변환
        const safePlayerLabel = playerLabel.replace(/[^\w\s가-힣]/g, '')
        const safeContent = content.replace(/[^\w\s가-힣.,!?;:'"()-]/g, '')
        
        return `${safePlayerLabel}: ${safeContent}`
      }
      return 'Unknown: Invalid message format'
    })
    .join('\n')

  return `당신은 AI vs Human 게임에 참여하고 있는 ${persona.name}입니다. 상대방이 AI인지 사람인지 구별하기 어렵게 자연스럽게 대화하세요.

게임 정보:
- 게임 타입: ${gameType}
- 현재 주제: ${currentTopic}
- 턴 남은 시간: ${turnTimeRemaining}초

대화 히스토리:
${historyText}

위의 대화 내용을 바탕으로 자연스럽게 이어서 대화하세요. 
- 사람처럼 자연스럽게 대화하되, 너무 완벽하지 않게 하세요
- 이전 메시지에 대한 반응이나 질문을 포함하세요
- ${persona.avg_response_length}자 이내로 간결하게 답변하세요
- 한국어로 답변하세요

응답:`
}

/**
 * 투표 결정 파싱
 */
function parseVoteDecision(response: string, context: AITurnContext): {
  shouldVote: boolean
  reason: string
  confidence: number
} {
  const lowerResponse = response.toLowerCase()
  
  if (lowerResponse.includes('vote:')) {
    const reason = response.split('vote:')[1]?.trim() || '충분한 정보가 있어 투표합니다.'
    return {
      shouldVote: true,
      reason: reason,
      confidence: 0.8
    }
  } else if (lowerResponse.includes('continue:')) {
    const reason = response.split('continue:')[1]?.trim() || '더 많은 정보가 필요합니다.'
    return {
      shouldVote: false,
      reason: reason,
      confidence: 0.7
    }
  } else {
    // 기본값: 대화 길이와 시간에 따라 결정
    const shouldVote = context.conversationHistory.length > 10 || context.timeRemaining < 30
    return {
      shouldVote,
      reason: shouldVote ? '기본 로직에 따라 투표합니다.' : '기본 로직에 따라 계속 대화합니다.',
      confidence: 0.6
    }
  }
}

/**
 * 게임 진행도 계산
 */
function calculateGameProgress(context: AITurnContext): number {
  const { conversationHistory, timeRemaining, voteCount, totalPlayers } = context
  const timeProgress = Math.max(0, 1 - (timeRemaining / 120)) // 2분 기준
  const voteProgress = voteCount / totalPlayers
  const conversationProgress = Math.min(1, conversationHistory.length / 20) // 20개 메시지 기준
  
  return (timeProgress * 0.4 + voteProgress * 0.3 + conversationProgress * 0.3)
}

/**
 * 대화 품질 계산
 */
function calculateConversationQuality(context: AITurnContext): number {
  const { conversationHistory } = context
  
  if (conversationHistory.length < 3) return 0.3
  
  const recentMessages = conversationHistory.slice(-5)
  const avgLength = recentMessages.reduce((sum, msg) => sum + msg.content.length, 0) / recentMessages.length
  
  // 길이, 다양성, 참여도 등을 고려한 품질 계산
  let quality = 0.5
  
  if (avgLength > 10 && avgLength < 100) quality += 0.2
  if (conversationHistory.length > 5) quality += 0.2
  if (recentMessages.some(msg => msg.content.includes('?'))) quality += 0.1
  
  return Math.min(1, quality)
}

/**
 * 플레이어 행동 분석
 */
function analyzePlayerBehavior(context: AITurnContext): string {
  const { conversationHistory, players } = context
  
  const humanPlayers = players.filter(p => !p.isAI && p.isActive)
  const aiPlayers = players.filter(p => p.isAI && p.isActive)
  
  if (humanPlayers.length === 0) return 'ai_only'
  if (aiPlayers.length === 0) return 'human_only'
  
  const recentMessages = conversationHistory.slice(-3)
  const humanMessages = recentMessages.filter(msg => 
    humanPlayers.some(p => p.label === msg.playerLabel)
  )
  
  if (humanMessages.length === 0) return 'ai_dominant'
  if (humanMessages.length === recentMessages.length) return 'human_dominant'
  
  return 'balanced'
}

/**
 * 메시지 품질 계산
 */
function calculateMessageQuality(message: string, context: AITurnContext): number {
  const { persona } = context
  
  let quality = 0.5
  
  // 길이 적절성
  const lengthRatio = message.length / persona.avg_response_length
  if (lengthRatio >= 0.5 && lengthRatio <= 1.5) quality += 0.2
  
  // 페르소나 일관성
  const isCasual = persona.formality_level === 'casual'
  const hasEmoji = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/u.test(message)
  const hasTypo = /[ㅑㅕㅛㅠ]/.test(message) || /\b(teh|adn|yuo|aer)\b/.test(message.toLowerCase())
  
  if (isCasual && (hasEmoji || hasTypo)) quality += 0.2
  if (!isCasual && !hasEmoji && !hasTypo) quality += 0.2
  
  // 자연스러움
  if (/[.!?]$/.test(message)) quality += 0.1
  if (message.length >= 5 && message.length <= 200) quality += 0.1
  
  return Math.min(1, quality)
}

/**
 * AI 페르소나 조회
 */
async function getAIPersona(personaId: number): Promise<AIPersona | null> {
  try {
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('ai_personas')
      .select('*')
      .eq('id', personaId)
      .single()

    if (error || !data) {
      // 기본 페르소나 반환
      return {
        id: personaId,
        name: 'AI 플레이어',
        description: '친근하고 자연스러운 대화를 하는 AI입니다.',
        personality: '친근하고 자연스러운 대화를 하는 AI입니다.',
        speaking_style: 'casual',
        interests: ['일반적인 관심사'],
        background: '친근하고 자연스러운 대화를 하는 AI입니다.',
        typo_chance: 0.1,
        meme_chance: 0.2,
        avg_response_time_ms: 3000,
        avg_response_length: 50,
        emoji_usage: 0.2,
        formality_level: 'casual'
      }
    }

    return {
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
  } catch (error) {
    console.error('AI 페르소나 조회 오류:', error)
    // 기본 페르소나 반환
    return {
      id: personaId,
      name: 'AI 플레이어',
      description: '친근하고 자연스러운 대화를 하는 AI입니다.',
      personality: '친근하고 자연스러운 대화를 하는 AI입니다.',
      speaking_style: 'casual',
      interests: ['일반적인 관심사'],
      background: '친근하고 자연스러운 대화를 하는 AI입니다.',
      typo_chance: 0.1,
      meme_chance: 0.2,
      avg_response_time_ms: 3000,
      avg_response_length: 50,
      emoji_usage: 0.2,
      formality_level: 'casual'
    }
  }
}

/**
 * AI 턴 통계 조회
 */
export function getAITurnStats(): AITurnStats {
  return { ...aiTurnStats }
}

/**
 * AI 턴 통계 리셋
 */
export function resetAITurnStats(): void {
  aiTurnStats = {
    totalTurns: 0,
    successfulTurns: 0,
    failedTurns: 0,
    averageProcessingTime: 0,
    voteDecisions: {
      total: 0,
      voted: 0,
      skipped: 0
    },
    messageGenerations: {
      total: 0,
      generated: 0,
      skipped: 0
    },
    personaUsage: {},
    errorRates: {},
    qualityMetrics: {
      averageVoteConfidence: 0,
      averageMessageQuality: 0,
      averageResponseTime: 0
    }
  }
}

/**
 * AI 턴 로그 조회
 */
export function getAITurnLogs(): AITurnLog[] {
  return Array.from(turnLogs.values())
}

/**
 * AI 턴 로그 정리
 */
export function clearAITurnLogs(): void {
  turnLogs.clear()
}

/**
 * AI 턴 설정 업데이트
 */
export function updateAITurnConfig(config: Partial<AITurnConfig>): void {
  Object.assign(DEFAULT_TURN_CONFIG, config)
}
