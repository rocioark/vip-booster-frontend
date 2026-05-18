'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'

export default function Root() {
  const router = useRouter()
  useEffect(() => {
    router.replace(isAuthenticated() ? '/admin/dashboard' : '/login')
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
