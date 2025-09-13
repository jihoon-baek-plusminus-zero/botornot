'use client'

import { useRouter } from 'next/navigation'

interface MenuButtonProps {
  title: string
  description: string
  icon: string
  onClick: () => void
}

const MenuButton = ({ title, description, icon, onClick }: MenuButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="group w-full p-6 rounded-xl bg-dark-card border border-dark-border hover:border-dark-accent/50 transition-all duration-300 hover:shadow-lg hover:shadow-dark-accent/10 hover:-translate-y-1"
    >
      <div className="text-center">
        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-dark-text mb-2 group-hover:text-dark-accent transition-colors duration-300">
          {title}
        </h3>
        <p className="text-sm text-dark-text-secondary group-hover:text-dark-text transition-colors duration-300">
          {description}
        </p>
      </div>
    </button>
  )
}

export default function MainMenu() {
  const router = useRouter()

  const menuItems = [
    {
      id: '1v1',
      title: '1:1',
      description: '일대일 대화',
      icon: '👤'
    },
    {
      id: '1vn',
      title: '1:N',
      description: '일대다 대화',
      icon: '👥'
    },
    {
      id: 'chatroom',
      title: '채팅방',
      description: '일반 채팅방',
      icon: '💬'
    },
    {
      id: 'ai-chat',
      title: 'AI 채팅방',
      description: 'AI와의 대화',
      icon: '🤖'
    },
    {
      id: 'lobby',
      title: '대기실',
      description: '대기 및 준비',
      icon: '🏠'
    }
  ]

  const handleButtonClick = async (id: string) => {
    if (id === '1v1') {
      // 1:1 대기방으로 이동
      router.push('/1on1_waiting')
    } else if (id === 'chatroom') {
      router.push('/chatroom')
    } else if (id === 'ai-chat') {
      // AI 채팅방 생성 및 입장
      try {
        const response = await fetch('/api/chatroom/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            totalPlayers: 2,
            playerTypes: ['human', 'ai'] // 첫 번째는 사람(나), 두 번째는 AI
          })
        })

        if (response.ok) {
          const data = await response.json()
          // 채팅방 ID와 플레이어 ID를 URL 파라미터로 전달
          router.push(`/chatroom?roomId=${data.room.id}&playerId=0`)
        } else {
          console.error('AI 채팅방 생성 실패')
        }
      } catch (error) {
        console.error('AI 채팅방 생성 중 오류:', error)
      }
    } else if (id === 'lobby') {
      // 대기실 페이지로 이동
      router.push('/waiting')
    } else {
      // 다른 버튼들은 아직 기능이 없으므로 콘솔 로그만 출력
      console.log(`${id} 버튼이 클릭되었습니다.`)
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg py-8">
      <div className="container mx-auto px-4">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold text-gradient mb-6">
            Bot or Not
          </h1>
          <p className="text-xl text-dark-text-secondary mb-4">
            AI 봇과 인간을 구분하는 웹 애플리케이션
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-dark-accent to-blue-400 mx-auto rounded-full"></div>
        </div>

        {/* 메뉴 버튼들 */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <MenuButton
                key={item.id}
                title={item.title}
                description={item.description}
                icon={item.icon}
                onClick={() => handleButtonClick(item.id)}
              />
            ))}
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="mt-16 text-center">
          <div className="glass-effect rounded-xl p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-dark-text mb-3">
              서비스 준비 중
            </h3>
            <p className="text-dark-text-secondary text-sm leading-relaxed">
              현재 메인 화면이 구현되었습니다. 각 버튼의 기능은 추후 개발될 예정입니다.
              <br />
              깔끔한 다크테마 디자인으로 사용자 경험을 향상시켰습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
