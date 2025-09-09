/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 다크테마 색상 팔레트
        dark: {
          bg: '#0a0a0a',        // 진한 검정 배경
          card: '#1a1a1a',      // 어두운 회색 카드
          border: '#2a2a2a',    // 테두리 색상
          text: '#ffffff',      // 메인 텍스트
          'text-secondary': '#9ca3af', // 보조 텍스트
          accent: '#3b82f6',    // 파란색 액센트
          'accent-hover': '#2563eb', // 액센트 호버
          danger: '#ef4444',    // 위험/에러 색상
          success: '#10b981',   // 성공 색상
          warning: '#f59e0b',   // 경고 색상
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
