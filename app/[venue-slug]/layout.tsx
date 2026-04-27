import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'VIP Booster — Tickets',
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {children}
    </div>
  )
}
