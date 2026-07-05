'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminIndexPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/dashboard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <span className="h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
