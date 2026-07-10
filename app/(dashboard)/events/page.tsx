'use client'
import { useState, FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi, analyticsApi, vipPackagesApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader } from '@/components/ui/Card'
import { Header } from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { Event, EventAnalytics, VipPackage } from '@/lib/types'
import { BarChart2, ChevronDown, ChevronUp, Plus, Package, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AxiosError } from 'axios'

type EventStatus = Event['status']
const statusVariant: Record<EventStatus, 'yellow' | 'green' | 'red' | 'gray' | 'blue'> = {
  draft: 'yellow', published: 'green', sold_out: 'gray', cancelled: 'red', completed: 'blue',
}
const statusLabel: Record<EventStatus, string> = {
  draft: 'Borrador', published: 'Publicado', sold_out: 'Sold Out', cancelled: 'Cancelado', completed: 'Finalizado',
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function slugify(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

// ── VIP Packages panel ────────────────────────────────────────
function VipPackagesPanel({ eventId, venueId }: { eventId: string; venueId: string }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', tier_level: 1, price: '', quantity_total: '', description: '' })
  const [err, setErr] = useState('')

  const { data: pkgs, isLoading } = useQuery<VipPackage[]>({
    queryKey: ['vip-packages', eventId],
    queryFn: async () => { const r = await vipPackagesApi.list(eventId); return r.data },
  })

  const createMut = useMutation({
    mutationFn: () => vipPackagesApi.create({
      event_id: eventId,
      name: form.name,
      tier_level: Number(form.tier_level),
      price: Number(form.price),
      quantity_total: Number(form.quantity_total),
      description: form.description || null,
      features: {},
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vip-packages', eventId] })
      setForm({ name: '', tier_level: 1, price: '', quantity_total: '', description: '' })
      setShowForm(false)
      setErr('')
    },
    onError: (e: AxiosError<{ detail: string }>) => setErr(e.response?.data?.detail ?? 'Error al crear'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => vipPackagesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vip-packages', eventId] }),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name || !form.price || !form.quantity_total) { setErr('Nombre, precio y cantidad son requeridos'); return }
    createMut.mutate()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Packages VIP</p>
        <Button size="sm" variant="ghost" onClick={() => setShowForm(v => !v)}>
          <Plus className="h-3 w-3" /> Nuevo package
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input id="pkg-name" label="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="VIP Gold" />
            <Input id="pkg-tier" label="Tier level" type="number" min={1} value={form.tier_level} onChange={e => setForm(f => ({ ...f, tier_level: Number(e.target.value) }))} />
            <Input id="pkg-price" label="Precio (COP)" type="number" min={1} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="250000" />
            <Input id="pkg-qty" label="Cantidad total" type="number" min={1} value={form.quantity_total} onChange={e => setForm(f => ({ ...f, quantity_total: e.target.value }))} placeholder="50" />
          </div>
          <Input id="pkg-desc" label="Descripción (opcional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={() => { setShowForm(false); setErr('') }}>Cancelar</Button>
            <Button type="submit" size="sm" loading={createMut.isPending}>Crear package</Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
      ) : pkgs && pkgs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {pkgs.map(pkg => (
            <div key={pkg.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{pkg.name}</p>
                <p className="text-xs text-gray-500">{fmt(pkg.price)} · {pkg.quantity_sold}/{pkg.quantity_total} vendidos</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${pkg.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {pkg.is_active ? 'Activo' : 'Inactivo'}
                </span>
                <button
                  onClick={() => deleteMut.mutate(pkg.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">Sin packages aún</p>
      )}
    </div>
  )
}

// ── Event row ────────────────────────────────────────────────
function EventRow({ event }: { event: Event }) {
  const [panel, setPanel] = useState<null | 'analytics' | 'packages'>(null)
  const qc = useQueryClient()

  const { data: analytics, isFetching } = useQuery<EventAnalytics>({
    queryKey: ['event-analytics', event.id],
    queryFn: async () => { const r = await analyticsApi.event(event.id); return r.data },
    enabled: panel === 'analytics',
  })

  const toggleStatus = useMutation({
    mutationFn: () => eventsApi.update(event.id, { status: event.status === 'draft' ? 'published' : 'draft' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })

  const fmtDate = () => {
    try { return format(new Date(event.event_date), "d MMM yyyy", { locale: es }) } catch { return event.event_date }
  }

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 text-sm font-medium text-gray-900">{event.name}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{event.artist_name ?? '—'}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{fmtDate()}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{event.sold_count ?? 0} / {event.capacity ?? '∞'}</td>
        <td className="px-4 py-3">
          <Badge label={statusLabel[event.status]} variant={statusVariant[event.status]} />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => setPanel(p => p === 'analytics' ? null : 'analytics')} title="Analytics">
              <BarChart2 className="h-4 w-4" />
              {panel === 'analytics' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPanel(p => p === 'packages' ? null : 'packages')} title="Packages VIP">
              <Package className="h-4 w-4" />
            </Button>
            {event.status !== 'cancelled' && event.status !== 'sold_out' && event.status !== 'completed' && (
              <Button variant="secondary" size="sm" loading={toggleStatus.isPending} onClick={() => toggleStatus.mutate()}>
                {event.status === 'draft' ? 'Publicar' : 'Borrador'}
              </Button>
            )}
          </div>
        </td>
      </tr>

      {panel === 'analytics' && (
        <tr>
          <td colSpan={6} className="bg-gray-50 px-4 py-4">
            {isFetching ? (
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            ) : analytics ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-gray-500 text-xs">Revenue total</p><p className="font-semibold">{fmt(analytics.total_revenue)}</p></div>
                <div><p className="text-gray-500 text-xs">Tickets vendidos</p><p className="font-semibold">{analytics.tickets_sold}</p></div>
                <div><p className="text-gray-500 text-xs">Ocupación</p><p className="font-semibold">{analytics.occupancy_rate != null ? `${(analytics.occupancy_rate * 100).toFixed(1)}%` : '—'}</p></div>
                <div><p className="text-gray-500 text-xs">Online</p><p className="font-semibold">{analytics.sales_by_channel?.online ?? 0} ventas</p></div>
              </div>
            ) : null}
          </td>
        </tr>
      )}

      {panel === 'packages' && (
        <tr>
          <td colSpan={6} className="bg-gray-50 px-4 py-4">
            <VipPackagesPanel eventId={event.id} venueId={event.venue_id} />
          </td>
        </tr>
      )}
    </>
  )
}

// ── Create Event Modal ────────────────────────────────────────
function CreateEventModal({ open, onClose, venueId }: { open: boolean; onClose: () => void; venueId: string }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', slug: '', artist_name: '', event_date: '', event_start_time: '20:00', capacity: '', venue_location: '', description: '' })
  const [err, setErr] = useState('')

  const createMut = useMutation({
    mutationFn: () => eventsApi.create({
      venue_id: venueId,
      name: form.name,
      slug: form.slug,
      artist_name: form.artist_name || null,
      event_date: form.event_date,
      event_start_time: form.event_start_time,
      capacity: form.capacity ? Number(form.capacity) : null,
      venue_location: form.venue_location || null,
      description: form.description || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
      onClose()
      setForm({ name: '', slug: '', artist_name: '', event_date: '', event_start_time: '20:00', capacity: '', venue_location: '', description: '' })
      setErr('')
    },
    onError: (e: AxiosError<{ detail: string }>) => setErr(e.response?.data?.detail ?? 'Error al crear evento'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name || !form.slug || !form.event_date) { setErr('Nombre, slug y fecha son requeridos'); return }
    createMut.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo evento" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="ev-name"
            label="Nombre del evento *"
            value={form.name}
            onChange={e => {
              const name = e.target.value
              setForm(f => ({ ...f, name, slug: slugify(name) }))
            }}
            placeholder="Bad Bunny en vivo"
            className="col-span-2"
          />
          <Input
            id="ev-slug"
            label="Slug *"
            value={form.slug}
            onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
            placeholder="bad-bunny-en-vivo"
            className="col-span-2"
          />
          <Input id="ev-artist" label="Artista" value={form.artist_name} onChange={e => setForm(f => ({ ...f, artist_name: e.target.value }))} placeholder="Bad Bunny" />
          <Input id="ev-date" label="Fecha *" type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
          <Input id="ev-time" label="Hora de inicio *" type="time" value={form.event_start_time} onChange={e => setForm(f => ({ ...f, event_start_time: e.target.value }))} />
          <Input id="ev-cap" label="Capacidad" type="number" min={1} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="5000" />
          <Input id="ev-loc" label="Ubicación" value={form.venue_location} onChange={e => setForm(f => ({ ...f, venue_location: e.target.value }))} placeholder="Bogotá, Colombia" className="col-span-2" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Descripción</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Descripción del evento..."
          />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={createMut.isPending}>Crear evento</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────
const PAGE_SIZE = 20

export default function EventsPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<'all' | EventStatus>('all')
  const [page, setPage] = useState(0)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery<Event[]>({
    queryKey: ['events', user?.venue_id, page],
    queryFn: async () => {
      const res = await eventsApi.list({ venue_id: user?.venue_id ?? undefined, skip: page * PAGE_SIZE, limit: PAGE_SIZE })
      return res.data
    },
    enabled: !!user,
  })

  const filtered = filter === 'all' ? (data ?? []) : (data ?? []).filter(e => e.status === filter)

  return (
    <div>
      <Header title="Eventos" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2 flex-wrap flex-1">
            {(['all', 'draft', 'published', 'sold_out', 'completed', 'cancelled'] as const).map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === s ? 'bg-brand-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-brand-400'}`}>
                {s === 'all' ? 'Todos' : statusLabel[s]}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Nuevo evento
          </Button>
        </div>

        <Card>
          <CardHeader title={`${filtered.length} evento${filtered.length !== 1 ? 's' : ''}`} />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Artista</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Vendidos / Cap.</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (<td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>))}</tr>
                    ))
                  : filtered.map(event => <EventRow key={event.id} event={event} />)
                }
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No hay eventos</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {(data?.length === PAGE_SIZE || page > 0) && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Anterior</Button>
              <span className="text-xs text-gray-500">Página {page + 1}</span>
              <Button variant="secondary" size="sm" disabled={(data?.length ?? 0) < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>Siguiente →</Button>
            </div>
          )}
        </Card>
      </div>

      {user?.venue_id && (
        <CreateEventModal open={showCreate} onClose={() => setShowCreate(false)} venueId={user.venue_id} />
      )}
    </div>
  )
}
