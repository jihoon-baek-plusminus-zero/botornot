export default function Home() {
  return (
    <main className="min-h-screen bg-dark-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gradient mb-6 animate-fade-in">
            Bot or Not
          </h1>
          <p className="text-xl text-dark-text-secondary mb-8 animate-slide-up">
            AI 봇과 인간을 구분하는 웹 애플리케이션
          </p>
          
          <div className="max-w-2xl mx-auto">
            <div className="card animate-slide-up">
              <h2 className="text-2xl font-semibold mb-4 text-dark-text">
                서비스 준비 중
              </h2>
              <p className="text-dark-text-secondary mb-6">
                현재 프로젝트 초기 설정이 완료되었습니다. 
                곧 봇 감지 기능을 제공할 예정입니다.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="btn-primary">
                  시작하기
                </button>
                <button className="btn-secondary">
                  더 알아보기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
