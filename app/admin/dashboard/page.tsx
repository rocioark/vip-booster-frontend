'use client'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/lib/api'
import { useVenue } from '@/hooks/useVenueContext'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Header } from '@/components/layout/Header'
import type { VenueSummary } from '@/lib/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { TrendingUp, Ticket, CalendarDays, DollarSign } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

export default function DashboardPage() {
  const { effectiveVenueId } = useVenue()

  const { data, isLoading, isError } = useQuery<VenueSummary>({
    queryKey: ['analytics-summary', effectiveVenueId],
    queryFn: async () => {
      const res = await analyticsApi.summary(effectiveVenueId)
      return res.data
    },
    enabled: !!effectiveVenueId,
  })

  const stats = [
    { label: 'Revenue total', value: data ? fmt(Number(data.total_revenue)) : '—', icon: DollarSign, color: 'text-green-600 bg-green-100' },
    { label: 'Tickets vendidos', value: data?.tickets_sold ?? '—', icon: Ticket, color: 'text-brand-600 bg-brand-100' },
    { label: 'Órdenes completadas', value: data?.total_orders ?? '—', icon: TrendingUp, color: 'text-blue-600 bg-blue-100' },
    { label: 'Eventos totales', value: data?.total_events ?? '—', icon: CalendarDays, color: 'text-yellow-600 bg-yellow-100' },
  ]

  const chartData = data?.top_events.map((e) => ({
    name: e.event_name.length > 18 ? e.event_name.slice(0, 18) + '…' : e.event_name,
    revenue: e.revenue,
    tickets: e.tickets_sold,
  })) ?? []

  if (!effectiveVenueId) {
    return (
      <div>
        <Header title="Dashboard" />
        <div className="p-6">
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
            Selecciona un venue en el menú lateral para ver el dashboard.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardBody className="flex items-center gap-4">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-lg font-bold text-gray-900">
                    {isLoading
                      ? <span className="inline-block h-4 w-20 bg-gray-200 rounded animate-pulse" />
                      : s.value}
                  </p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader title="Revenue últimos 30 días" />
          <CardBody>
            {isLoading ? (
              <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-gray-900">
                {data ? fmt(Number(data.revenue_last_30_days)) : '—'}
              </p>
            )}
          </CardBody>
        </Card>

        {(chartData.length > 0 || isLoading) && (
          <Card>
            <CardHeader title="Top 5 eventos por revenue" />
            <CardBody className="h-64">
              {isLoading ? (
                <div className="h-full w-full bg-gray-100 rounded animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="revenue" name="Revenue" fill="#c026d3" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>
        )}

        {isError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            No se pudieron cargar los datos de analytics.
          </div>
        )}

        {!isLoading && !isError && data && data.total_orders === 0 && data.tickets_sold === 0 && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
            Aún no hay datos registrados para este venue.
          </div>
        )}
      </div>
    </div>
  )
}
