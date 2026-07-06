'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarDays, ShoppingCart, ScanLine, Users, Tag, LogOut, Building2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/hooks/useAuth'
import { useVenue } from '@/hooks/useVenueContext'
import { Logo } from '@/components/Logo'

const nav = [
  { href: '/admin/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/admin/events',     label: 'Eventos',      icon: CalendarDays },
  { href: '/admin/orders',     label: 'Órdenes',      icon: ShoppingCart },
  { href: '/admin/customers',  label: 'Clientes',     icon: Users },
  { href: '/admin/discounts',  label: 'Descuentos',   icon: Tag },
  { href: '/admin/check-in',   label: 'Check-in',     icon: ScanLine },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { venues, effectiveVenueId, setSelectedVenueId, venuesLoading } = useVenue()
  const isSuperAdmin = user?.role === 'super_admin'

  return (
    <aside className="flex h-screen w-56 flex-col bg-gray-900 text-white shrink-0">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-700">
        <Logo className="h-8 w-8" />
        <span className="font-semibold text-sm tracking-wide">VIP Booster</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
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

      {isSuperAdmin && (
        <div className="px-4 py-3 border-t border-gray-700">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Building2 className="h-3 w-3 text-gray-500" />
            <p className="text-xs text-gray-500">Venue activo</p>
          </div>
          {venuesLoading ? (
            <div className="h-7 bg-gray-800 rounded animate-pulse" />
          ) : venues.length > 0 ? (
            <select
              value={effectiveVenueId ?? ''}
              onChange={e => setSelectedVenueId(e.target.value)}
              className="w-full bg-gray-800 text-gray-200 text-xs rounded-lg px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-brand-500"
            >
              {venues.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-red-400">Sin venues</p>
          )}
        </div>
      )}

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
