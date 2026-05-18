import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'VIP Booster — Check-in',
  description: 'Scanner de tickets VIP',
  manifest: '/manifest.json',
  themeColor: '#c026d3',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VIP Check-in',
  },
}

export default function CheckinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {children}
    </div>
  )
}
