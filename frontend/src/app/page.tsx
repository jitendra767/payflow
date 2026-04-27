'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

export default function Home() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) {
        router.replace('/dashboard')
      } else {
        router.replace('/login')
      }
      setChecking(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [user, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center">
          <span className="text-white font-bold text-lg">P</span>
        </div>
        <p className="text-sm text-gray-400">Loading PayFlow...</p>
      </div>
    </div>
  )
}