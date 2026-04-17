'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi, ticketsApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader } from '@/components/ui/Card'
import { Header } from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CreateOrderModal } from '@/components/orders/CreateOrderModal'
import type { Order, Ticket } from '@/lib/types'
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Plus, Download } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type OrderStatus = Order['payment_status']

const statusVariant: Record<OrderStatus, 'yellow' | 'green' | 'red' | 'gray'> = {
  pending: 'yellow', completed: 'green', cancelled: 'red', refunded: 'gray', failed: 'red',
}
const statusLabel: Record<OrderStatus, string> = {
  pending: 'Pendiente', completed: 'Completada', cancelled: 'Cancelada', refunded: 'Reembolsada', failed: 'Fallida',
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  try { return format(new Date(d), "d MMM yyyy HH:mm", { locale: es }) } catch { return d }
}

const PAGE_SIZE = 25

function OrderRow({ order }: { order: Order }) {
  const [open, setOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancel, setShowCancel] = useState(false)
  const qc = useQueryClient()

  const { data: tickets, isFetching } = useQuery<Ticket[]>({
    queryKey: ['order-tickets', order.id],
    queryFn: async () => { const r = await ordersApi.tickets(order.id); return r.data },
    enabled: open,
  })

  const confirmMut = useMutation({
    mutationFn: () => ordersApi.confirmPayment(order.id, 'MANUAL'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })

  const cancelMut = useMutation({
    mutationFn: () => ordersApi.cancel(order.id, cancelReason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); setShowCancel(false) },
  })

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{order.order_number}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{order.holder_name ?? '—'}</td>
        <td className="px-4 py-3 text-sm text-gray-600 capitalize">{order.payment_method}</td>
        <td className="px-4 py-3 text-sm font-medium text-gray-900">{fmt(Number(order.total))}</td>
        <td className="px-4 py-3">
          <Badge label={statusLabel[order.payment_status]} variant={statusVariant[order.payment_status]} />
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(order.created_at)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen(v => !v)} title="Ver tickets">
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {order.payment_status === 'pending' && (
              <>
                <Button variant="primary" size="sm" loading={confirmMut.isPending} onClick={() => confirmMut.mutate()} title="Confirmar pago">
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button variant="danger" size="sm" onClick={() => setShowCancel(v => !v)} title="Cancelar">
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </td>
      </tr>

      {showCancel && (
        <tr>
          <td colSpan={7} className="bg-red-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <input
                className="flex-1 rounded border border-red-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
                placeholder="Motivo de cancelación"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />
              <Button variant="danger" size="sm" loading={cancelMut.isPending} disabled={!cancelReason.trim()} onClick={() => cancelMut.mutate()}>
                Confirmar cancelación
              </Button>
            </div>
          </td>
        </tr>
      )}

      {open && (
        <tr>
          <td colSpan={7} className="bg-gray-50 px-4 py-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Tickets</p>
            {isFetching ? (
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            ) : tickets && tickets.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tickets.map(t => (
                  <div key={t.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs">
                    <span className="font-mono font-medium">{t.ticket_code}</span>
                    <Badge
                      label={t.status === 'valid' ? 'Válido' : t.status === 'used' ? 'Usado' : 'Cancelado'}
                      variant={t.status === 'valid' ? 'green' : t.status === 'used' ? 'blue' : 'red'}
                    />
                    {t.holder_name && <span className="text-gray-500">{t.holder_name}</span>}
                    {t.checked_in_at && (
                      <span className="text-gray-400">Check-in: {fmtDate(t.checked_in_at)}</span>
                    )}
                    {/* PDF Download */}
                    <a
                      href={ticketsApi.pdfUrl(t.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-brand-600 hover:text-brand-800 font-medium"
                      title="Descargar PDF"
                    >
                      <Download className="h-3 w-3" /> PDF
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Sin tickets</p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

export default function OrdersPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<'all' | OrderStatus>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery<Order[]>({
    queryKey: ['orders', page],
    queryFn: async () => {
      const r = await ordersApi.list({ skip: page * PAGE_SIZE, limit: PAGE_SIZE })
      return r.data
    },
    enabled: !!user,
  })

  const filtered = (data ?? [])
    .filter(o => filter === 'all' || o.payment_status === filter)
    .filter(o =>
      !search ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.holder_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (o.holder_email ?? '').toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div>
      <Header title="Órdenes" />
      <div className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Buscar por número, nombre o email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
          />
          <div className="flex gap-2 flex-wrap items-center">
            {(['all', 'pending', 'completed', 'cancelled', 'refunded'] as const).map(s => (
              <button key={s} onClick={() => { setFilter(s); setPage(0) }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === s ? 'bg-brand-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-brand-400'}`}>
                {s === 'all' ? 'Todos' : statusLabel[s]}
              </button>
            ))}
            {user?.venue_id && (
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" /> Nueva orden
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader title={`${filtered.length} orden${filtered.length !== 1 ? 'es' : ''}`} />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Pago</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (<td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>))}</tr>
                    ))
                  : filtered.map(order => <OrderRow key={order.id} order={order} />)
                }
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">No hay órdenes</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {(( data?.length ?? 0) === PAGE_SIZE || page > 0) && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Anterior</Button>
              <span className="text-xs text-gray-500">Página {page + 1}</span>
              <Button variant="secondary" size="sm" disabled={(data?.length ?? 0) < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>Siguiente →</Button>
            </div>
          )}
        </Card>
      </div>

      {user?.venue_id && (
        <CreateOrderModal open={showCreate} onClose={() => setShowCreate(false)} venueId={user.venue_id} />
      )}
    </div>
  )
}
