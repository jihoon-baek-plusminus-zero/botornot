'use client'

import { Trophy, Users, Bot, User, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Player {
  label: string
  color: string
  isAI: boolean
  voteCount: number
}

interface ResultsScreenProps {
  gameType: '1v1' | '1vn'
  players: Player[]
  myPlayerLabel: string
  myVote: string[]
  correctVote: boolean
  onBackToLobby: () => void
  onPlayAgain: () => void
}

export default function ResultsScreen({
  gameType,
  players,
  myPlayerLabel,
  myVote,
  correctVote,
  onBackToLobby,
  onPlayAgain
}: ResultsScreenProps) {
  const myPlayer = players.find(p => p.label === myPlayerLabel)
  const aiPlayers = players.filter(p => p.isAI)
  const humanPlayers = players.filter(p => !p.isAI)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-6 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Trophy className="w-8 h-8 text-yellow-300" />
            <h1 className="text-2xl font-bold text-white">
              게임 결과
            </h1>
          </div>
          <p className="text-purple-100">
            {gameType === '1v1' ? '1:1 Game' : '1:N Game'} 완료
          </p>
        </div>

        {/* 결과 내용 */}
        <div className="p-6 space-y-6">
          {/* 내 추측 결과 */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              내 추측 결과
            </h3>
            <div className="flex items-center space-x-2">
              {correctVote ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className={cn(
                "font-medium",
                correctVote ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {correctVote ? '정답!' : '틀렸습니다'}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              내 투표: {myVote.map(v => `Player ${v}`).join(', ')}
            </p>
          </div>

          {/* 플레이어 결과 */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              플레이어 정체
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* AI 플레이어들 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center space-x-2">
                  <Bot className="w-4 h-4" />
                  <span>AI 플레이어</span>
                </h4>
                {aiPlayers.map((player) => (
                  <div
                    key={player.label}
                    className="flex items-center space-x-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
                  >
                    <div 
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold",
                        player.color
                      )}
                    >
                      {player.label}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        Player {player.label}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        투표 {player.voteCount}표
                      </p>
                    </div>
                    <Bot className="w-5 h-5 text-red-500" />
                  </div>
                ))}
              </div>

              {/* 사람 플레이어들 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>사람 플레이어</span>
                </h4>
                {humanPlayers.map((player) => (
                  <div
                    key={player.label}
                    className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                  >
                    <div 
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold",
                        player.color
                      )}
                    >
                      {player.label}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        Player {player.label}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        투표 {player.voteCount}표
                      </p>
                    </div>
                    <User className="w-5 h-5 text-green-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 통계 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              게임 통계
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-300">총 플레이어</p>
                <p className="font-semibold text-gray-900 dark:text-white">{players.length}명</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-300">AI 플레이어</p>
                <p className="font-semibold text-red-600 dark:text-red-400">{aiPlayers.length}명</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-300">사람 플레이어</p>
                <p className="font-semibold text-green-600 dark:text-green-400">{humanPlayers.length}명</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-300">내 정답률</p>
                <p className="font-semibold text-blue-600 dark:text-blue-400">
                  {correctVote ? '100%' : '0%'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 버튼들 */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex space-x-3">
          <button
            onClick={onBackToLobby}
            className="flex-1 py-3 px-6 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            로비로 돌아가기
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 px-6 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            다시 플레이
          </button>
        </div>
      </div>
    </div>
  )
}
