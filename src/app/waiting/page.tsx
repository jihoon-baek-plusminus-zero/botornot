'use client'

import { useRouter } from 'next/navigation'

export default function WaitingRoom() {
  const router = useRouter()

  const handleGoBack = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text flex flex-col">
      {/* 상단 바 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          뒤로가기
        </button>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* 로딩 애니메이션 */}
        <div className="mb-8">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
        </div>

        {/* 상대를 찾는중 텍스트 */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white mb-2">
            상대를 찾는중
          </h1>
          <p className="text-gray-400">
            매칭을 위해 잠시만 기다려주세요...
          </p>
        </div>
      </div>
    </div>
  )
}
