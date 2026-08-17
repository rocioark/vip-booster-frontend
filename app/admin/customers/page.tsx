'use client'
import { useState, FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { customersApi, eventsApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import { useVenue } from '@/hooks/useVenueContext'
import { Card, CardHeader } from '@/components/ui/Card'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ID_TYPES, type Customer, type Event } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Users, Mail, Phone, ShoppingBag, Pencil, Download, X, ArrowUp, ArrowDown,
} from 'lucide-react'

function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return format(new Date(d), "d MMM yyyy", { locale: es }) } catch { return d }
}

const PAGE_SIZE = 30

// Mismas claves que acepta el backend (lista blanca en customer_repository)
type SortKey = 'full_name' | 'total_purchases' | 'total_tickets' | 'last_purchase_at' | 'created_at'

interface SortState { by: SortKey; dir: 'asc' | 'desc' }

function SortableTh({ label, column, sort, onSort }: {
  label: string
  column: SortKey
  sort: SortState
  onSort: (c: SortKey) => void
}) {
  const active = sort.by === column
  const Arrow = sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 uppercase tracking-wide transition-colors ${
          active ? 'text-gray-900' : 'hover:text-gray-700'
        }`}
      >
        {label}
        {active && <Arrow className="h-3 w-3" />}
      </button>
    </th>
  )
}

/**
 * Edición de los datos del cliente. Nombre, email, teléfono y documento son
 * los que pide la pasarela para un cobro real, así que se pueden corregir
 * sin depender de que el comprador los haya tecleado bien.
 */
function EditCustomerModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    full_name: customer.full_name,
    email: customer.email,
    phone: customer.phone ?? '',
    id_type: customer.id_type ?? 'CC',
    id_number: customer.id_number ?? '',
  })
  const [err, setErr] = useState('')

  const saveMut = useMutation({
    mutationFn: () => customersApi.update(customer.id, {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      // Sin número, el tipo de documento no dice nada
      id_type: form.id_number.trim() ? form.id_type : null,
      id_number: form.id_number.trim() || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      onClose()
    },
    onError: (e: AxiosError<{ detail: unknown }>) => {
      const detail = e.response?.data?.detail
      setErr(typeof detail === 'string' ? detail : 'No se pudo guardar el cliente')
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { setErr('El nombre es requerido'); return }
    if (!form.email.trim()) { setErr('El email es requerido'); return }
    setErr('')
    saveMut.mutate()
  }

  return (
    <Modal open onClose={onClose} title={`Editar ${customer.full_name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="cu-name"
            label="Nombre completo *"
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            wrapperClassName="col-span-2"
          />
          <Input
            id="cu-email"
            label="Email *"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            wrapperClassName="col-span-2"
          />
          <Input
            id="cu-phone"
            label="Teléfono"
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="3001234567"
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="cu-id-type" className="text-sm font-medium text-gray-700">Tipo de documento</label>
            <select
              id="cu-id-type"
              value={form.id_type}
              onChange={e => setForm(f => ({ ...f, id_type: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <Input
            id="cu-id-number"
            label="Número de documento"
            value={form.id_number}
            onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))}
            placeholder="1234567890"
            wrapperClassName="col-span-2"
          />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saveMut.isPending}>Guardar cambios</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function CustomersPage() {
  const { user } = useAuth()
  const { effectiveVenueId } = useVenue()
  const isSuperAdmin = user?.role === 'super_admin'
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [eventId, setEventId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState<{ by: SortKey; dir: 'asc' | 'desc' }>({
    by: 'created_at', dir: 'desc',
  })
  const [exporting, setExporting] = useState(false)
  const [exportErr, setExportErr] = useState('')
  // Búsqueda en el servidor (ILIKE sobre nombre/email/teléfono) con
  // debounce: busca en TODOS los clientes, no solo en la página cargada.
  const debouncedSearch = useDebounce(search.trim())

  // Eventos del venue para el filtro "compraron para..."
  const { data: events } = useQuery<Event[]>({
    queryKey: ['events', effectiveVenueId],
    queryFn: async () => {
      const r = await eventsApi.list({ venue_id: effectiveVenueId ?? undefined })
      return r.data
    },
    enabled: !!user && !!effectiveVenueId,
  })

  // Los filtros van juntos al backend y al CSV: un export que no coincide con
  // lo que se ve en pantalla es peor que no tener export.
  const filters = {
    ...(effectiveVenueId ? { venue_id: effectiveVenueId } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(eventId ? { event_id: eventId } : {}),
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
    sort_by: sort.by,
    sort_dir: sort.dir,
  }
  const hasFilters = !!(debouncedSearch || eventId || dateFrom || dateTo)

  const { data, isLoading } = useQuery<{ items: Customer[]; total: number }>({
    queryKey: ['customers', filters, page],
    queryFn: async () => {
      const r = await customersApi.list({ ...filters, skip: page * PAGE_SIZE, limit: PAGE_SIZE })
      // El total de la búsqueda viaja en la cabecera, no en el body
      const total = Number(r.headers['x-total-count'] ?? r.data.length)
      return { items: r.data, total: Number.isFinite(total) ? total : r.data.length }
    },
    enabled: !!user && (isSuperAdmin || !!effectiveVenueId),
    placeholderData: prev => prev,
  })

  const filtered = data?.items ?? []
  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const firstRow = total === 0 ? 0 : page * PAGE_SIZE + 1
  const lastRow = Math.min(total, page * PAGE_SIZE + filtered.length)

  function toggleSort(by: SortKey) {
    setPage(0)
    setSort(s => s.by === by
      ? { by, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      // Fechas y números arrancan de mayor a menor: es lo que se quiere ver
      : { by, dir: by === 'full_name' ? 'asc' : 'desc' })
  }

  function clearFilters() {
    setSearch(''); setEventId(''); setDateFrom(''); setDateTo(''); setPage(0)
  }

  async function exportCsv() {
    setExporting(true)
    setExportErr('')
    try {
      const r = await customersApi.exportCsv(filters)
      const url = URL.createObjectURL(new Blob([r.data], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      if (r.headers['x-truncated'] === 'true') {
        setExportErr('El CSV se cortó en 10.000 filas. Afiná los filtros para exportar el resto.')
      }
    } catch {
      setExportErr('No se pudo generar el CSV. Intentá de nuevo.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <Header title="Clientes" />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-[220px] max-w-md">
            <label htmlFor="cu-search" className="text-xs font-medium text-gray-500">Buscar</label>
            <input
              id="cu-search"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Nombre, email o teléfono..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label htmlFor="cu-event" className="text-xs font-medium text-gray-500">Evento</label>
            <select
              id="cu-event"
              value={eventId}
              onChange={e => { setEventId(e.target.value); setPage(0) }}
              disabled={!effectiveVenueId}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
            >
              <option value="">Todos los eventos</option>
              {(events ?? []).map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="cu-from" className="text-xs font-medium text-gray-500">Compraron desde</label>
            <input
              id="cu-from" type="date" value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(0) }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="cu-to" className="text-xs font-medium text-gray-500">Hasta</label>
            <input
              id="cu-to" type="date" value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(0) }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" /> Limpiar
            </Button>
          )}
          <div className="ml-auto">
            <Button variant="secondary" size="sm" loading={exporting} onClick={exportCsv} disabled={total === 0}>
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </Button>
          </div>
        </div>

        {exportErr && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{exportErr}</p>
        )}

        <Card>
          <CardHeader
            title={
              isLoading && !data
                ? 'Cargando clientes…'
                : `${total.toLocaleString('es-CO')} cliente${total !== 1 ? 's' : ''}${hasFilters ? ' con estos filtros' : ''}`
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <SortableTh label="Cliente" column="full_name" sort={sort} onSort={toggleSort} />
                  <th className="px-4 py-3">Contacto</th>
                  <SortableTh label="Compras" column="total_purchases" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Tickets" column="total_tickets" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Última compra" column="last_purchase_at" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Registrado" column="created_at" sort={sort} onSort={toggleSort} />
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
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
                        <td className="px-4 py-3">
                          <Button variant="secondary" size="sm" onClick={() => setEditing(customer)}>
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                        </td>
                      </tr>
                    ))
                }
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        {hasFilters
                          ? 'Ningún cliente coincide con estos filtros'
                          : 'No hay clientes registrados aún'}
                      </p>
                      {hasFilters && (
                        <button onClick={clearFilters} className="text-sm text-brand-600 hover:underline mt-2">
                          Limpiar filtros
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Mostrando {firstRow.toLocaleString('es-CO')}–{lastRow.toLocaleString('es-CO')} de {total.toLocaleString('es-CO')}
              </span>
              <div className="flex items-center gap-3">
                <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Anterior</Button>
                <span className="text-xs text-gray-500">Página {page + 1} de {pageCount}</span>
                <Button variant="secondary" size="sm" disabled={page + 1 >= pageCount} onClick={() => setPage(p => p + 1)}>Siguiente →</Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {editing && (
        <EditCustomerModal
          // Remonta el formulario al cambiar de cliente
          key={editing.id}
          customer={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
