'use client'
import { useState, FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { customersApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import { useVenue } from '@/hooks/useVenueContext'
import { Card, CardHeader } from '@/components/ui/Card'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ID_TYPES, type Customer } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Users, Mail, Phone, ShoppingBag, Pencil } from 'lucide-react'

function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return format(new Date(d), "d MMM yyyy", { locale: es }) } catch { return d }
}

const PAGE_SIZE = 30

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
  // Búsqueda en el servidor (ILIKE sobre nombre/email/teléfono) con
  // debounce: busca en TODOS los clientes, no solo en la página cargada.
  const debouncedSearch = useDebounce(search.trim())

  const { data, isLoading } = useQuery<Customer[]>({
    queryKey: ['customers', effectiveVenueId, page, debouncedSearch],
    queryFn: async () => {
      const params: { venue_id?: string; search?: string; skip: number; limit: number } = {
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      }
      if (effectiveVenueId) params.venue_id = effectiveVenueId
      if (debouncedSearch) params.search = debouncedSearch
      const r = await customersApi.list(params)
      return r.data
    },
    enabled: !!user && (isSuperAdmin || !!effectiveVenueId),
    placeholderData: prev => prev,
  })

  const filtered = data ?? []

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
                        {debouncedSearch
                          ? `Sin resultados para "${debouncedSearch}"`
                          : 'No hay clientes registrados aún'}
                      </p>
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
