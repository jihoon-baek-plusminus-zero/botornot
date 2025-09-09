'use client'

import { useState } from 'react'

export default function ChatRoom() {
  const [message, setMessage] = useState('')

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log('메시지 전송:', message)
      setMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage()
    }
  }

  return (
    <div className="h-screen bg-dark-bg flex flex-col">
      {/* 상단바 */}
      <div className="bg-dark-card border-b border-dark-border p-4 flex items-center justify-between">
        <button className="text-dark-text hover:text-dark-accent transition-colors">
          ← 나가기
        </button>
        <h1 className="text-lg font-semibold text-dark-text">제목</h1>
        <div></div>
      </div>

      {/* 중앙 대화창 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 상대방 메시지 */}
        <div className="flex items-start space-x-3">
          <div className="flex flex-col items-center">
            <div className="text-xs text-dark-text-secondary mb-1">Player</div>
            <div className="w-8 h-8 bg-dark-border rounded-full flex items-center justify-center">
              <span className="text-dark-text">?</span>
            </div>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-lg p-3 max-w-xs">
            <p className="text-dark-text text-sm">안녕하세요!</p>
          </div>
        </div>

        {/* 내 메시지 */}
        <div className="flex justify-end">
          <div className="bg-dark-accent rounded-lg p-3 max-w-xs">
            <p className="text-white text-sm">안녕하세요! 반갑습니다.</p>
          </div>
        </div>

        {/* 상대방 메시지 */}
        <div className="flex items-start space-x-3">
          <div className="flex flex-col items-center">
            <div className="text-xs text-dark-text-secondary mb-1">Player</div>
            <div className="w-8 h-8 bg-dark-border rounded-full flex items-center justify-center">
              <span className="text-dark-text">?</span>
            </div>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-lg p-3 max-w-xs">
            <p className="text-dark-text text-sm">오늘 날씨가 좋네요.</p>
          </div>
        </div>

        {/* 내 메시지 */}
        <div className="flex justify-end">
          <div className="bg-dark-accent rounded-lg p-3 max-w-xs">
            <p className="text-white text-sm">네, 정말 좋은 날씨입니다!</p>
          </div>
        </div>
      </div>

      {/* 하단바 */}
      <div className="bg-dark-card border-t border-dark-border p-4">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-dark-text placeholder-dark-text-secondary focus:outline-none focus:border-dark-accent"
          />
          <button
            onClick={handleSendMessage}
            className="bg-dark-accent hover:bg-dark-accent-hover text-white p-2 rounded-lg transition-colors"
          >
            ↵
          </button>
        </div>
      </div>
    </div>
  )
}
