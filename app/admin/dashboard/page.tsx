'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/lib/api'
import { useVenue } from '@/hooks/useVenueContext'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Header } from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { PLAN_LABELS, type VenueSummary } from '@/lib/types'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  TrendingUp, Ticket, CalendarDays, DollarSign, UserCheck, Clock, PieChart, CalendarClock,
} from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function fmtNum(n: number) {
  return new Intl.NumberFormat('es-CO').format(n)
}

function fmtDay(iso: string) {
  try { return format(parseISO(iso), 'd MMM', { locale: es }) } catch { return iso }
}

function fmtDateTime(iso: string) {
  try { return format(new Date(iso), "d MMM HH:mm", { locale: es }) } catch { return iso }
}

const ORDER_STATUS: Record<string, { label: string; variant: 'green' | 'red' | 'yellow' | 'gray' }> = {
  completed: { label: 'Pagada', variant: 'green' },
  pending: { label: 'Pendiente', variant: 'yellow' },
  failed: { label: 'Fallida', variant: 'red' },
  refunded: { label: 'Reembolsada', variant: 'gray' },
  cancelled: { label: 'Cancelada', variant: 'gray' },
}

/** Toggle boletas / ingresos, compartido por los dos gráficos. */
type Metric = 'tickets' | 'revenue'

function MetricToggle({ value, onChange }: { value: Metric; onChange: (m: Metric) => void }) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
      {(['tickets', 'revenue'] as const).map(m => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`px-3 py-1 font-medium transition-colors ${
            value === m ? 'bg-brand-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          {m === 'tickets' ? 'Boletas' : 'Ingresos'}
        </button>
      ))}
    </div>
  )
}

function StatCard({ label, value, hint, icon: Icon, color, loading }: {
  label: string
  value: string | number
  hint?: string
  icon: typeof Ticket
  color: string
  loading: boolean
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${color}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-900">
            {loading
              ? <span className="inline-block h-4 w-20 bg-gray-200 rounded animate-pulse" />
              : value}
          </p>
          {!loading && hint && <p className="text-xs text-gray-400 truncate">{hint}</p>}
        </div>
      </CardBody>
    </Card>
  )
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

  // Un venue que solo hace eventos gratis tiene todo el revenue en 0: ahí el
  // gráfico por ingresos sale vacío y el que dice algo es el de boletas.
  const hasRevenue = Number(data?.total_revenue ?? 0) > 0
  const [trendMetric, setTrendMetric] = useState<Metric | null>(null)
  const [topMetric, setTopMetric] = useState<Metric | null>(null)
  const trend: Metric = trendMetric ?? (hasRevenue ? 'revenue' : 'tickets')
  const top: Metric = topMetric ?? (hasRevenue ? 'revenue' : 'tickets')

  const monthlyLimit = data?.plan_monthly_limit ?? null
  const monthUsed = data?.tickets_this_month ?? 0
  const monthPct = monthlyLimit ? Math.min(100, Math.round(monthUsed / monthlyLimit * 100)) : 0

  const attendancePct = data && data.tickets_sold > 0
    ? Math.round(data.checked_in_tickets / data.tickets_sold * 100)
    : null

  const trendData = (data?.daily ?? []).map(d => ({
    name: fmtDay(d.date),
    tickets: d.tickets,
    revenue: Number(d.revenue),
  }))

  const topData = (data?.top_events ?? []).map(e => ({
    name: e.event_name.length > 18 ? e.event_name.slice(0, 18) + '…' : e.event_name,
    tickets: e.tickets_sold,
    revenue: Number(e.revenue),
    occupancy: e.occupancy_rate,
  }))

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
        {/* Resultado acumulado */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Boletas vendidas" loading={isLoading}
            value={data ? fmtNum(data.tickets_sold) : '—'}
            hint={data ? `${fmtNum(data.tickets_last_30_days)} en los últimos 30 días` : undefined}
            icon={Ticket} color="text-brand-600 bg-brand-100"
          />
          <StatCard
            label="Asistencia (check-in)" loading={isLoading}
            value={data ? fmtNum(data.checked_in_tickets) : '—'}
            hint={attendancePct !== null ? `${attendancePct}% de las boletas vendidas` : undefined}
            icon={UserCheck} color="text-green-600 bg-green-100"
          />
          <StatCard
            label="Órdenes completadas" loading={isLoading}
            value={data ? fmtNum(data.total_orders) : '—'}
            icon={TrendingUp} color="text-blue-600 bg-blue-100"
          />
          <StatCard
            label="Ingresos totales" loading={isLoading}
            value={data ? fmt(Number(data.total_revenue)) : '—'}
            hint={data ? `${fmt(Number(data.revenue_last_30_days))} en los últimos 30 días` : undefined}
            icon={DollarSign} color="text-emerald-600 bg-emerald-100"
          />
        </div>

        {/* Estado operativo: lo que hay para atender */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Órdenes pendientes de pago" loading={isLoading}
            value={data ? fmtNum(data.pending_orders) : '—'}
            hint={data && data.pending_orders > 0 ? `${fmt(Number(data.pending_orders_amount))} sin cobrar` : undefined}
            icon={Clock} color="text-amber-600 bg-amber-100"
          />
          <StatCard
            label="Eventos próximos" loading={isLoading}
            value={data ? fmtNum(data.upcoming_events) : '—'}
            hint={data ? `${fmtNum(data.total_events)} eventos en total` : undefined}
            icon={CalendarClock} color="text-indigo-600 bg-indigo-100"
          />
          <StatCard
            label="Ocupación promedio" loading={isLoading}
            value={data?.avg_occupancy_rate != null ? `${data.avg_occupancy_rate}%` : '—'}
            hint={data?.avg_occupancy_rate == null ? 'Ningún evento tiene capacidad definida' : 'Eventos con capacidad definida'}
            icon={PieChart} color="text-purple-600 bg-purple-100"
          />
          <Card>
            <CardBody className="flex items-center gap-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl shrink-0 text-yellow-600 bg-yellow-100">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">Boletas este mes</p>
                {isLoading ? (
                  <span className="inline-block h-4 w-20 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <>
                    <p className="text-lg font-bold text-gray-900">
                      {fmtNum(monthUsed)}
                      <span className="text-sm font-normal text-gray-400">
                        {' / '}{monthlyLimit ? fmtNum(monthlyLimit) : '∞'}
                      </span>
                    </p>
                    {monthlyLimit ? (
                      <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${monthPct >= 100 ? 'bg-red-500' : monthPct >= 80 ? 'bg-amber-500' : 'bg-brand-500'}`}
                          style={{ width: `${monthPct}%` }}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 truncate">
                        Plan {data?.plan ? PLAN_LABELS[data.plan] : '—'}: sin límite
                      </p>
                    )}
                  </>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Tendencia de los últimos 30 días */}
        <Card>
          <CardHeader
            title={trend === 'tickets' ? 'Boletas por día (últimos 30)' : 'Ingresos por día (últimos 30)'}
            action={<MetricToggle value={trend} onChange={setTrendMetric} />}
          />
          <CardBody className="h-64">
            {isLoading ? (
              <div className="h-full w-full bg-gray-100 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => trend === 'tickets' ? String(v) : `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(v: number) => trend === 'tickets' ? `${fmtNum(v)} boletas` : fmt(v)} />
                  <Line
                    type="monotone"
                    dataKey={trend}
                    name={trend === 'tickets' ? 'Boletas' : 'Ingresos'}
                    stroke="#c026d3"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Top eventos */}
        {(topData.length > 0 || isLoading) && (
          <Card>
            <CardHeader
              title={top === 'tickets' ? 'Top 5 eventos por boletas' : 'Top 5 eventos por ingresos'}
              action={<MetricToggle value={top} onChange={setTopMetric} />}
            />
            <CardBody className="h-64">
              {isLoading ? (
                <div className="h-full w-full bg-gray-100 rounded animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => top === 'tickets' ? String(v) : `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(v: number, _n, item) => {
                        const occ = (item?.payload as { occupancy: number | null })?.occupancy
                        const base = top === 'tickets' ? `${fmtNum(v)} boletas` : fmt(v)
                        return occ != null ? `${base} · ${occ}% de ocupación` : base
                      }}
                    />
                    <Bar
                      dataKey={top}
                      name={top === 'tickets' ? 'Boletas' : 'Ingresos'}
                      fill="#c026d3"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={72}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>
        )}

        {/* Últimas órdenes */}
        {!isLoading && (data?.recent_orders?.length ?? 0) > 0 && (
          <Card>
            <CardHeader title="Últimas órdenes" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="px-4 py-3 font-medium">Orden</th>
                    <th className="px-4 py-3 font-medium">Evento</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data!.recent_orders.map(o => {
                    const badge = ORDER_STATUS[o.payment_status] ?? ORDER_STATUS.pending
                    return (
                      <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-900">{o.order_number}</td>
                        <td className="px-4 py-3 text-gray-700">{o.event_name}</td>
                        <td className="px-4 py-3 text-gray-600">{o.customer_name ?? '—'}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {Number(o.total) > 0 ? fmt(Number(o.total)) : 'Gratis'}
                        </td>
                        <td className="px-4 py-3"><Badge label={badge.label} variant={badge.variant} /></td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDateTime(o.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
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
