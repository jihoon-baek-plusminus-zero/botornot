import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bot or Not - AI 봇 감지 웹앱',
  description: 'AI 봇과 인간을 구분하는 웹 애플리케이션',
  keywords: ['AI', '봇 감지', '웹앱', 'Next.js'],
  authors: [{ name: 'jihoonbaek' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-dark-bg text-dark-text`}>
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}
