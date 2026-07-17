'use client'
import { useState, FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { discountsApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useVenue } from '@/hooks/useVenueContext'
import { Card, CardHeader } from '@/components/ui/Card'
import { Header } from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { Discount } from '@/lib/types'
import { Plus, Tag, PowerOff } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AxiosError } from 'axios'

function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return format(new Date(d), "d MMM yyyy", { locale: es }) } catch { return d }
}

function CreateDiscountModal({ open, onClose, venueId }: { open: boolean; onClose: () => void; venueId: string }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    max_uses: '',
    valid_from: '',
    valid_to: '',
  })
  const [err, setErr] = useState('')

  const createMut = useMutation({
    mutationFn: () => discountsApi.create({
      venue_id: venueId,
      code: form.code.toUpperCase(),
      description: form.description || null,
      discount_type: form.discount_type,
      value: Number(form.value),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      valid_from: form.valid_from || null,
      valid_to: form.valid_to || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discounts'] })
      onClose()
      setForm({ code: '', description: '', discount_type: 'percentage', value: '', max_uses: '', valid_from: '', valid_to: '' })
      setErr('')
    },
    onError: (e: AxiosError<{ detail: unknown }>) => {
      const detail = e.response?.data?.detail
      setErr(typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Error al crear descuento')
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.code.trim()) { setErr('El código es requerido'); return }
    const value = Number(form.value)
    if (!form.value || !Number.isFinite(value) || value <= 0) {
      setErr(form.discount_type === 'percentage'
        ? 'El porcentaje es requerido y debe ser mayor a 0'
        : 'El valor en COP es requerido y debe ser mayor a 0')
      return
    }
    if (form.discount_type === 'percentage' && value > 100) {
      setErr('El porcentaje no puede ser mayor a 100')
      return
    }
    setErr('')
    createMut.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo descuento" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="dc-code"
            label="Código *"
            value={form.code}
            onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="PROMO20"
            className="col-span-2 font-mono"
          />
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700">Tipo de descuento</label>
            <div className="flex gap-3 mt-1">
              {(['percentage', 'fixed'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, discount_type: t }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.discount_type === t
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-brand-400'
                  }`}
                >
                  {t === 'percentage' ? 'Porcentaje (%)' : 'Valor fijo (COP)'}
                </button>
              ))}
            </div>
          </div>
          {/* type="text" + saneo de dígitos: un input number con "50.000" o
              "$50000" reporta value="" y el campo parecía lleno pero no lo estaba */}
          <Input
            id="dc-value"
            label={form.discount_type === 'percentage' ? 'Porcentaje * (ej: 20)' : 'Valor (COP) *'}
            type="text"
            inputMode="numeric"
            value={form.value}
            onChange={e => setForm(f => ({ ...f, value: e.target.value.replace(/\D/g, '') }))}
            placeholder={form.discount_type === 'percentage' ? '20' : '50000'}
          />
          <Input
            id="dc-max"
            label="Usos máximos"
            type="text"
            inputMode="numeric"
            value={form.max_uses}
            onChange={e => setForm(f => ({ ...f, max_uses: e.target.value.replace(/\D/g, '') }))}
            placeholder="Ilimitado"
          />
          <Input
            id="dc-from"
            label="Válido desde"
            type="date"
            value={form.valid_from}
            onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))}
          />
          <Input
            id="dc-until"
            label="Válido hasta"
            type="date"
            value={form.valid_to}
            onChange={e => setForm(f => ({ ...f, valid_to: e.target.value }))}
          />
          <Input
            id="dc-desc"
            label="Descripción"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Descuento de lanzamiento"
            className="col-span-2"
          />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={createMut.isPending}>Crear descuento</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function DiscountsPage() {
  const { user } = useAuth()
  const { effectiveVenueId } = useVenue()
  const [showCreate, setShowCreate] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<Discount[]>({
    queryKey: ['discounts', effectiveVenueId],
    queryFn: async () => {
      const r = await discountsApi.list({ venue_id: effectiveVenueId })
      return r.data
    },
    enabled: !!user && !!effectiveVenueId,
  })

  // DELETE /{code} deactivates the discount (soft-delete, no activate endpoint exists)
  const deactivateMut = useMutation({
    mutationFn: (code: string) => discountsApi.deactivate(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discounts'] }),
  })

  return (
    <div>
      <Header title="Descuentos" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          {effectiveVenueId && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Nuevo descuento
            </Button>
          )}
        </div>

        <Card>
          <CardHeader title={`${(data ?? []).length} código${(data ?? []).length !== 1 ? 's' : ''}`} />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Descuento</th>
                  <th className="px-4 py-3">Usos</th>
                  <th className="px-4 py-3">Vigencia</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>
                      ))}</tr>
                    ))
                  : (data ?? []).map(d => (
                      <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-sm text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{d.code}</span>
                          {d.description && <p className="text-xs text-gray-500 mt-0.5">{d.description}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {d.discount_type === 'percentage'
                            ? `${Number(d.value)}%`
                            : `$${Number(d.value).toLocaleString('es-CO')}`}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {d.current_uses} {d.max_uses ? `/ ${d.max_uses}` : '/ ∞'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {d.valid_from || d.valid_to
                            ? `${fmtDate(d.valid_from)} → ${fmtDate(d.valid_to)}`
                            : 'Sin límite'
                          }
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            label={d.is_active ? 'Activo' : 'Inactivo'}
                            variant={d.is_active ? 'green' : 'gray'}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {d.is_active ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={deactivateMut.isPending}
                              onClick={() => deactivateMut.mutate(d.code)}
                            >
                              <PowerOff className="h-3.5 w-3.5" />
                              Desactivar
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No reactivable</span>
                          )}
                        </td>
                      </tr>
                    ))
                }
                {!isLoading && (data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Tag className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No hay códigos de descuento</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {effectiveVenueId && (
        <CreateDiscountModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          venueId={effectiveVenueId}
        />
      )}
    </div>
  )
}
