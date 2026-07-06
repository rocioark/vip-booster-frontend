'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarDays, ShoppingCart, ScanLine, LogOut } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/hooks/useAuth'
import { Logo } from '@/components/Logo'

const nav = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/events',    label: 'Eventos',    icon: CalendarDays },
  { href: '/orders',    label: 'Órdenes',    icon: ShoppingCart },
  { href: '/check-in',  label: 'Check-in',   icon: ScanLine },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className="flex h-screen w-56 flex-col bg-gray-900 text-white shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-700">
        <Logo className="h-8 w-8" />
        <span className="font-semibold text-sm tracking-wide">VIP Booster</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="border-t border-gray-700 px-4 py-4">
        <p className="text-xs text-gray-400 truncate">{user?.full_name}</p>
        <p className="text-xs text-gray-500 truncate mb-3">{user?.email}</p>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
