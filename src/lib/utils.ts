import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 플레이어 색상 배열
export const PLAYER_COLORS = [
  'bg-red-500',
  'bg-blue-500', 
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-orange-500'
]

// 플레이어 라벨 생성
export const PLAYER_LABELS = ['A', 'B', 'C', 'D', 'E']

// 랜덤 ID 생성
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// 시간 포맷팅 (초를 mm:ss 형태로)
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
