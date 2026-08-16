'use client'
import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Building2, Pencil, Plus } from 'lucide-react'
import { venuesApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PLAN_LABELS, PLAN_MONTHLY_LIMIT, type SubscriptionStatus, type Venue, type VenuePlan } from '@/lib/types'

function slugify(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function fmtDate(d: string) {
  try { return format(new Date(d), 'd MMM yyyy', { locale: es }) } catch { return d }
}

const STATUS_BADGE: Record<string, { label: string; variant: 'green' | 'red' | 'yellow' | 'gray' }> = {
  active: { label: 'Activo', variant: 'green' },
  suspended: { label: 'Suspendido', variant: 'red' },
  pending: { label: 'Pendiente de activación', variant: 'yellow' },
  cancelled: { label: 'Cancelado', variant: 'gray' },
}

function apiErr(e: unknown): string {
  const detail = (e as AxiosError<{ detail: string }>).response?.data?.detail
  return typeof detail === 'string' ? detail : 'Error inesperado'
}

export default function VenuesAdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Venue | null>(null)
  const [rowErr, setRowErr] = useState('')

  const isSuperAdmin = user?.role === 'super_admin'
  useEffect(() => {
    // El backend igual devuelve 403; esto solo evita mostrar una página rota.
    if (!loading && user && !isSuperAdmin) router.replace('/admin/dashboard')
  }, [loading, user, isSuperAdmin, router])

  const { data: venues, isLoading } = useQuery<Venue[]>({
    queryKey: ['venues-admin'],
    queryFn: async () => (await venuesApi.list()).data,
    enabled: !!user && isSuperAdmin,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['venues-admin'] })
    qc.invalidateQueries({ queryKey: ['venues-list'] }) // selector del sidebar
  }

  const planMut = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: VenuePlan }) => venuesApi.update(id, { plan }),
    onSuccess: invalidate,
    onError: (e) => setRowErr(apiErr(e)),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      venuesApi.update(id, { subscription_status: status }),
    onSuccess: invalidate,
    onError: (e) => setRowErr(apiErr(e)),
  })

  if (loading || !isSuperAdmin) return null

  return (
    <div>
      <Header title="Venues" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {venues ? `${venues.length} venue${venues.length === 1 ? '' : 's'} en la plataforma` : ''}
          </p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo venue
          </Button>
        </div>

        {rowErr && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{rowErr}</p>
        )}

        <Card>
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">Cargando venues…</div>
          ) : !venues?.length ? (
            <div className="p-10 text-center text-gray-400">
              <Building2 className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No hay venues todavía</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="px-4 py-3 font-medium">Venue</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Boletas este mes</th>
                    <th className="px-4 py-3 font-medium">Registrado</th>
                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {venues.map(v => {
                    const status = v.subscription_status ?? 'active'
                    const badge = STATUS_BADGE[status] ?? STATUS_BADGE.active
                    const plan = v.plan ?? 'starter'
                    const limit = PLAN_MONTHLY_LIMIT[plan]
                    const sold = v.tickets_this_month ?? 0
                    const overLimit = limit !== null && sold >= limit
                    return (
                      <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{v.name}</p>
                          <p className="text-xs text-gray-400">/{v.slug}</p>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={plan}
                            disabled={planMut.isPending}
                            onChange={e => { setRowErr(''); planMut.mutate({ id: v.id, plan: e.target.value as VenuePlan }) }}
                            className="rounded-lg border border-gray-300 px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                          >
                            {Object.entries(PLAN_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3"><Badge label={badge.label} variant={badge.variant} /></td>
                        <td className="px-4 py-3">
                          <span className={overLimit ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                            {sold.toLocaleString('es-CO')}{limit !== null ? ` / ${limit.toLocaleString('es-CO')}` : ' / ∞'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{fmtDate(v.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="secondary"
                              onClick={() => { setRowErr(''); setEditing(v) }}>
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                            {status === 'active' ? (
                              <Button size="sm" variant="secondary"
                                onClick={() => { setRowErr(''); statusMut.mutate({ id: v.id, status: 'suspended' }) }}>
                                Suspender
                              </Button>
                            ) : (
                              <Button size="sm"
                                onClick={() => { setRowErr(''); statusMut.mutate({ id: v.id, status: 'active' }) }}>
                                Activar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <CreateVenueModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={invalidate} />
      {editing && (
        <EditVenueModal
          // Remonta el formulario al cambiar de venue
          key={editing.id}
          venue={editing}
          onClose={() => setEditing(null)}
          onSaved={invalidate}
        />
      )}
    </div>
  )
}

/**
 * Edición completa del venue (super admin). El plan y el estado también se
 * cambian desde la fila; aquí van junto al resto para no tener que entrar
 * por dos sitios distintos.
 */
function EditVenueModal({ venue, onClose, onSaved }: {
  venue: Venue
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: venue.name,
    slug: venue.slug,
    plan: (venue.plan ?? 'starter') as VenuePlan,
    subscription_status: venue.subscription_status ?? 'active',
    owner_name: '',
    owner_email: '',
  })
  const [err, setErr] = useState('')

  // El listado no trae los datos de contacto; el detalle sí.
  const { isLoading: loadingDetail } = useQuery<Venue>({
    queryKey: ['venue-detail', venue.id],
    queryFn: async () => {
      const detail = (await venuesApi.get(venue.id)).data as Venue
      setForm(f => ({
        ...f,
        owner_name: f.owner_name || detail.owner_name || '',
        owner_email: f.owner_email || detail.owner_email || '',
      }))
      return detail
    },
  })

  const saveMut = useMutation({
    mutationFn: () => venuesApi.update(venue.id, {
      name: form.name.trim(),
      slug: form.slug,
      plan: form.plan,
      subscription_status: form.subscription_status,
      owner_name: form.owner_name.trim(),
      owner_email: form.owner_email.trim(),
    }),
    onSuccess: () => { onSaved(); onClose() },
    onError: (e) => setErr(apiErr(e)),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setErr('El nombre es requerido'); return }
    if (form.slug.length < 3) { setErr('El slug debe tener al menos 3 caracteres'); return }
    if (!form.owner_name.trim() || !form.owner_email.trim()) {
      setErr('Nombre y email de contacto son requeridos'); return
    }
    setErr('')
    saveMut.mutate()
  }

  return (
    <Modal open onClose={onClose} title={`Editar ${venue.name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input id="ev-name" label="Nombre *" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input id="ev-slug" label="Slug *" value={form.slug}
            onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))} />
          <div className="col-span-2 -mt-2">
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Cambiar el slug cambia la URL pública del venue: los enlaces
              <span className="font-mono"> /{venue.slug}</span> que ya circulan dejan de funcionar.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="ev-plan" className="text-sm font-medium text-gray-700">Plan</label>
            <select id="ev-plan" value={form.plan}
              onChange={e => setForm(f => ({ ...f, plan: e.target.value as VenuePlan }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
              {Object.entries(PLAN_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="ev-status" className="text-sm font-medium text-gray-700">Estado</label>
            <select id="ev-status" value={form.subscription_status}
              onChange={e => setForm(f => ({ ...f, subscription_status: e.target.value as SubscriptionStatus }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
              {Object.entries(STATUS_BADGE).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <Input id="ev-owner" label="Nombre del dueño *" value={form.owner_name}
            placeholder={loadingDetail ? 'Cargando…' : ''}
            onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} />
          <Input id="ev-owner-email" label="Email de contacto *" type="email" value={form.owner_email}
            placeholder={loadingDetail ? 'Cargando…' : ''}
            onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))} />
        </div>
        <p className="text-xs text-gray-500">
          Esto no cambia el email de login del usuario dueño: eso se edita en Usuarios.
        </p>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saveMut.isPending} disabled={loadingDetail}>Guardar cambios</Button>
        </div>
      </form>
    </Modal>
  )
}

function CreateVenueModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const empty = {
    name: '', slug: '', owner_name: '', owner_email: '', plan: 'starter' as VenuePlan,
    user_full_name: '', user_email: '', user_password: '', user_phone: '',
  }
  const [form, setForm] = useState(empty)
  const [err, setErr] = useState('')

  const createMut = useMutation({
    mutationFn: () => venuesApi.onboard({
      name: form.name,
      slug: form.slug,
      owner_name: form.owner_name,
      owner_email: form.owner_email,
      plan: form.plan,
      owner_user: {
        email: form.user_email || form.owner_email,
        full_name: form.user_full_name || form.owner_name,
        password: form.user_password,
        phone: form.user_phone || null,
      },
    }),
    onSuccess: () => { onCreated(); onClose(); setForm(empty); setErr('') },
    onError: (e) => setErr(apiErr(e)),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name || !form.slug || !form.owner_name || !form.owner_email) { setErr('Completa los datos del venue'); return }
    if (!form.user_password) { setErr('Define la contraseña del owner (mín. 8, letra y número)'); return }
    createMut.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo venue (onboarding manual)" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs font-semibold uppercase text-gray-400">Datos del venue</p>
        <div className="grid grid-cols-2 gap-4">
          <Input id="v-name" label="Nombre *" value={form.name}
            onChange={e => { const name = e.target.value; setForm(f => ({ ...f, name, slug: slugify(name) })) }} />
          <Input id="v-slug" label="Slug *" value={form.slug}
            onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))} />
          <Input id="v-owner" label="Nombre del dueño *" value={form.owner_name}
            onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} />
          <Input id="v-email" label="Email de contacto *" type="email" value={form.owner_email}
            onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Plan</label>
          <select
            value={form.plan}
            onChange={e => setForm(f => ({ ...f, plan: e.target.value as VenuePlan }))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {Object.entries(PLAN_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <p className="text-xs font-semibold uppercase text-gray-400 pt-2">Acceso del owner (usuario venue_owner)</p>
        <div className="grid grid-cols-2 gap-4">
          <Input id="u-name" label="Nombre completo" placeholder="(usa el del dueño)" value={form.user_full_name}
            onChange={e => setForm(f => ({ ...f, user_full_name: e.target.value }))} />
          <Input id="u-email" label="Email de login" type="email" placeholder="(usa el de contacto)" value={form.user_email}
            onChange={e => setForm(f => ({ ...f, user_email: e.target.value }))} />
          <Input id="u-pass" label="Contraseña *" type="password" value={form.user_password}
            onChange={e => setForm(f => ({ ...f, user_password: e.target.value }))} />
          <Input id="u-phone" label="Teléfono" value={form.user_phone}
            onChange={e => setForm(f => ({ ...f, user_phone: e.target.value }))} />
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={createMut.isPending}>Crear venue</Button>
        </div>
      </form>
    </Modal>
  )
}
