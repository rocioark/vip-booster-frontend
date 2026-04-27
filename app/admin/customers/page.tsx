'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { customersApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useVenue } from '@/hooks/useVenueContext'
import { Card, CardHeader } from '@/components/ui/Card'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import type { Customer } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Users, Mail, Phone, ShoppingBag } from 'lucide-react'

function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return format(new Date(d), "d MMM yyyy", { locale: es }) } catch { return d }
}

const PAGE_SIZE = 30

export default function CustomersPage() {
  const { user } = useAuth()
  const { effectiveVenueId } = useVenue()
  const isSuperAdmin = user?.role === 'super_admin'
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery<Customer[]>({
    queryKey: ['customers', effectiveVenueId, page],
    queryFn: async () => {
      const params: { venue_id?: string; skip: number; limit: number } = {
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      }
      if (effectiveVenueId) params.venue_id = effectiveVenueId
      const r = await customersApi.list(params)
      return r.data
    },
    enabled: !!user && (isSuperAdmin || !!effectiveVenueId),
  })

  const filtered = (data ?? []).filter(c =>
    !search ||
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search)
  )

  return (
    <div>
      <Header title="Clientes" />
      <div className="p-6 space-y-4">
        <div className="flex gap-3">
          <input
            className="flex-1 max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
          />
        </div>

        <Card>
          <CardHeader title={`${filtered.length} cliente${filtered.length !== 1 ? 's' : ''}`} />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Compras</th>
                  <th className="px-4 py-3">Tickets</th>
                  <th className="px-4 py-3">Última compra</th>
                  <th className="px-4 py-3">Registrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>
                      ))}</tr>
                    ))
                  : filtered.map(customer => (
                      <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-brand-700">
                                {customer.full_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{customer.full_name}</p>
                              {customer.id_number && (
                                <p className="text-xs text-gray-400">{customer.id_type} {customer.id_number}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Mail className="h-3 w-3 text-gray-400" />
                              <span>{customer.email}</span>
                            </div>
                            {customer.phone && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Phone className="h-3 w-3 text-gray-400" />
                                <span>{customer.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                            <ShoppingBag className="h-3.5 w-3.5 text-gray-400" />
                            {customer.total_purchases}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {customer.total_tickets}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {fmtDate(customer.last_purchase_at)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {fmtDate(customer.created_at)}
                        </td>
                      </tr>
                    ))
                }
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No hay clientes registrados aún</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {((data?.length ?? 0) === PAGE_SIZE || page > 0) && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Anterior</Button>
              <span className="text-xs text-gray-500">Página {page + 1}</span>
              <Button variant="secondary" size="sm" disabled={(data?.length ?? 0) < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>Siguiente →</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
