'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function OldDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    router.replace(`/admin${pathname}`)
  }, [router, pathname])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <span className="h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
