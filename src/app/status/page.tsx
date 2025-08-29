'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface SystemStatus {
  name: string
  status: 'online' | 'offline' | 'error'
  message: string
  timestamp: string
}

export default function StatusPage() {
  const router = useRouter()
  const [systemStatuses, setSystemStatuses] = useState<SystemStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAllSystems()
  }, [])

  const checkAllSystems = async () => {
    setIsLoading(true)
    const statuses: SystemStatus[] = []

    // 1. Supabase 연결 상태 확인
    try {
      const { error } = await supabase.auth.getSession()
      if (error) {
        statuses.push({
          name: 'Supabase Database',
          status: 'error',
          message: `연결 오류: ${error.message}`,
          timestamp: new Date().toLocaleString('ko-KR')
        })
      } else {
        statuses.push({
          name: 'Supabase Database',
          status: 'online',
          message: '정상 연결됨',
          timestamp: new Date().toLocaleString('ko-KR')
        })
      }
    } catch (err) {
      statuses.push({
        name: 'Supabase Database',
        status: 'error',
        message: `연결 실패: ${err}`,
        timestamp: new Date().toLocaleString('ko-KR')
      })
    }

    // 2. 클라이언트에서 접근 가능한 환경 변수만 확인
    const clientEnvVars = [
      { name: 'NEXT_PUBLIC_SUPABASE_URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL },
      { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }
    ]

    clientEnvVars.forEach(env => {
      if (env.value) {
        statuses.push({
          name: `Environment: ${env.name}`,
          status: 'online',
          message: '설정됨',
          timestamp: new Date().toLocaleString('ko-KR')
        })
      } else {
        statuses.push({
          name: `Environment: ${env.name}`,
          status: 'error',
          message: '설정되지 않음',
          timestamp: new Date().toLocaleString('ko-KR')
        })
      }
    })

    // 3. 서버 전용 환경 변수는 별도로 표시
    statuses.push({
      name: 'Server Environment Variables',
      status: 'online',
      message: 'OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY (서버에서만 접근 가능)',
      timestamp: new Date().toLocaleString('ko-KR')
    })

    // 4. 브라우저 정보
    statuses.push({
      name: 'Browser Info',
      status: 'online',
      message: `${navigator.userAgent}`,
      timestamp: new Date().toLocaleString('ko-KR')
    })

    // 5. 네트워크 상태
    if (navigator.onLine) {
      statuses.push({
        name: 'Network Connection',
        status: 'online',
        message: '온라인',
        timestamp: new Date().toLocaleString('ko-KR')
      })
    } else {
      statuses.push({
        name: 'Network Connection',
        status: 'offline',
        message: '오프라인',
        timestamp: new Date().toLocaleString('ko-KR')
      })
    }

    // 6. 현재 시간
    statuses.push({
      name: 'System Time',
      status: 'online',
      message: new Date().toISOString(),
      timestamp: new Date().toLocaleString('ko-KR')
    })

    setSystemStatuses(statuses)
    setIsLoading(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'offline':
        return 'bg-yellow-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return '온라인'
      case 'offline':
        return '오프라인'
      case 'error':
        return '오류'
      default:
        return '알 수 없음'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            뒤로가기
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">시스템 상태</h1>
          <button
            onClick={checkAllSystems}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200"
          >
            새로고침
          </button>
        </div>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">시스템 상태 확인 중...</p>
          </div>
        )}

        {/* 상태 목록 */}
        {!isLoading && (
          <div className="grid gap-4">
            {systemStatuses.map((status, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-l-blue-500"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${getStatusColor(status.status)}`}></div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {status.name}
                    </h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    status.status === 'online' ? 'bg-green-100 text-green-800' :
                    status.status === 'offline' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {getStatusText(status.status)}
                  </span>
                </div>
                <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm">
                  {status.message}
                </p>
                <p className="mt-1 text-gray-400 dark:text-gray-500 text-xs">
                  {status.timestamp}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* 추가 정보 */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">개발 정보</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>프레임워크:</strong> Next.js 15.5.0</p>
              <p><strong>언어:</strong> TypeScript</p>
              <p><strong>스타일링:</strong> Tailwind CSS</p>
            </div>
            <div>
              <p><strong>데이터베이스:</strong> Supabase</p>
              <p><strong>배포:</strong> Vercel</p>
              <p><strong>버전 관리:</strong> GitHub</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
