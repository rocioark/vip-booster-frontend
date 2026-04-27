'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/lib/public-api'
import type { Order, Ticket } from '@/lib/types'
import Link from 'next/link'
import { CheckCircle2, Download, QrCode, Calendar, Clock } from 'lucide-react'
import { BASE_URL } from '@/lib/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  try { return format(new Date(d), "d 'de' MMMM yyyy, HH:mm", { locale: es }) } catch { return d }
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente de pago', color: 'text-yellow-400' },
  completed: { label: 'Pagado', color: 'text-green-400' },
  cancelled: { label: 'Cancelado', color: 'text-red-400' },
  failed: { label: 'Fallido', color: 'text-red-400' },
  refunded: { label: 'Reembolsado', color: 'text-gray-400' },
}

function ConfirmacionContent({ venueSlug }: { venueSlug: string }) {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order')

  const { data: order, isLoading: loadingOrder } = useQuery<Order>({
    queryKey: ['public-order', orderId],
    queryFn: async () => { const r = await publicApi.getOrder(orderId!); return r.data },
    enabled: !!orderId,
  })

  const { data: tickets, isLoading: loadingTickets } = useQuery<Ticket[]>({
    queryKey: ['public-tickets', orderId],
    queryFn: async () => { const r = await publicApi.getOrderTickets(orderId!); return r.data },
    enabled: !!orderId,
  })

  const isLoading = loadingOrder || loadingTickets

  if (!orderId) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">No se encontró la orden.</p>
        <Link href={`/${venueSlug}`} className="text-brand-400 mt-2 inline-block">Volver al inicio</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-900/40 border border-green-600 mb-4">
          <CheckCircle2 className="h-10 w-10 text-green-400" />
        </div>
        <h1 className="text-3xl font-black text-white mb-1">¡Gracias por tu compra!</h1>
        <p className="text-gray-400">Guarda esta página para acceder a tus tickets</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : order ? (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Número de orden</span>
              <span className="font-mono font-bold text-white">{order.order_number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Estado</span>
              <span className={`font-semibold text-sm ${statusMap[order.payment_status]?.color ?? 'text-gray-300'}`}>
                {statusMap[order.payment_status]?.label ?? order.payment_status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Total</span>
              <span className="font-black text-brand-400 text-lg">{fmt(Number(order.total))}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Método de pago</span>
              <span className="text-white text-sm capitalize">{order.payment_method}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Fecha</span>
              <div className="flex items-center gap-1 text-sm text-gray-300">
                <Calendar className="h-3.5 w-3.5" />
                {fmtDate(order.created_at)}
              </div>
            </div>
          </div>

          {tickets && tickets.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <QrCode className="h-5 w-5 text-brand-400" />
                Tus tickets ({tickets.length})
              </h2>
              {tickets.map((ticket) => (
                <div key={ticket.id} className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <p className="font-mono text-lg font-bold text-white">{ticket.ticket_code}</p>
                      {ticket.holder_name && <p className="text-sm text-gray-400">{ticket.holder_name}</p>}
                      <div className="inline-flex items-center gap-1.5 text-xs">
                        <span className={`h-2 w-2 rounded-full ${ticket.status === 'valid' ? 'bg-green-500' : ticket.status === 'used' ? 'bg-gray-500' : 'bg-red-500'}`} />
                        <span className={ticket.status === 'valid' ? 'text-green-400' : ticket.status === 'used' ? 'text-gray-400' : 'text-red-400'}>
                          {ticket.status === 'valid' ? 'Válido' : ticket.status === 'used' ? 'Usado' : 'Cancelado'}
                        </span>
                      </div>
                      {ticket.checked_in_at && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Check-in: {fmtDate(ticket.checked_in_at)}
                        </p>
                      )}
                    </div>
                    {ticket.qr_code_url && (
                      <img src={ticket.qr_code_url} alt={`QR ${ticket.ticket_code}`}
                        className="h-20 w-20 rounded-lg border border-gray-700 shrink-0" />
                    )}
                  </div>
                  <a
                    href={`${BASE_URL}/api/v1/tickets/${ticket.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 text-sm text-brand-400 hover:text-brand-300 border border-brand-800 hover:border-brand-600 rounded-xl py-2.5 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Descargar PDF del ticket
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-12">No se pudieron cargar los detalles de la orden.</p>
      )}

      <div className="mt-10 text-center">
        <Link href={`/${venueSlug}`} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
          Ver más eventos →
        </Link>
      </div>
    </div>
  )
}

interface PageProps {
  params: { 'venue-slug': string }
}

export default function ConfirmacionPage({ params }: PageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <span className="h-8 w-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConfirmacionContent venueSlug={params['venue-slug']} />
    </Suspense>
  )
}
