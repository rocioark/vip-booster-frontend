'use client'
import { useEffect, useState, FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { Store, Send } from 'lucide-react'
import { venuesApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { PLAN_LABELS, PLAN_MONTHLY_LIMIT, type Venue, type VenuePlan } from '@/lib/types'

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

export default function MiVenuePage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const venueId = user?.venue_id

  const { data: venue, isLoading } = useQuery<Venue>({
    queryKey: ['mi-venue', venueId],
    queryFn: async () => (await venuesApi.get(venueId!)).data,
    enabled: !!venueId,
  })

  const [form, setForm] = useState({
    name: '', description: '', logo_url: '', instagram: '', facebook: '', whatsapp: '', website: '',
  })
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  const [planMsg, setPlanMsg] = useState('')
  const [planSent, setPlanSent] = useState(false)
  const [planErr, setPlanErr] = useState('')

  useEffect(() => {
    if (venue) {
      const v = venue as Venue & { description?: string; logo_url?: string; instagram?: string; facebook?: string; whatsapp?: string; website?: string }
      setForm({
        name: v.name ?? '',
        description: v.description ?? '',
        logo_url: v.logo_url ?? '',
        instagram: v.instagram ?? '',
        facebook: v.facebook ?? '',
        whatsapp: v.whatsapp ?? '',
        website: v.website ?? '',
      })
    }
  }, [venue])

  const saveMut = useMutation({
    mutationFn: () => venuesApi.update(venueId!, {
      name: form.name,
      description: form.description || null,
      logo_url: form.logo_url || null,
      instagram: form.instagram || null,
      facebook: form.facebook || null,
      whatsapp: form.whatsapp || null,
      website: form.website || null,
    }),
    onSuccess: () => {
      setSaved(true); setErr('')
      setTimeout(() => setSaved(false), 3000)
      qc.invalidateQueries({ queryKey: ['mi-venue'] })
      qc.invalidateQueries({ queryKey: ['venues-list'] })
    },
    onError: (e) => { setSaved(false); setErr(apiErr(e)) },
  })

  async function requestPlanChange() {
    setPlanErr('')
    try {
      const r = await fetch('/api/plan-change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_name: venue?.name,
          slug: venue?.slug,
          current_plan: PLAN_LABELS[(venue?.plan ?? 'starter') as VenuePlan],
          owner_email: user?.email,
          message: planMsg,
        }),
      })
      if (!r.ok) throw new Error()
      setPlanSent(true)
    } catch {
      setPlanErr('No se pudo enviar la solicitud. Intenta de nuevo.')
    }
  }

  if (!venueId) {
    return (
      <div>
        <Header title="Mi venue" />
        <div className="p-6"><p className="text-sm text-gray-500">Tu usuario no tiene un venue asociado.</p></div>
      </div>
    )
  }

  const plan = (venue?.plan ?? 'starter') as VenuePlan
  const limit = PLAN_MONTHLY_LIMIT[plan]
  const status = venue?.subscription_status ?? 'active'
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.active

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setErr('El nombre no puede estar vacío'); return }
    saveMut.mutate()
  }

  return (
    <div>
      <Header title="Mi venue" />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Perfil editable */}
        <Card className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Store className="h-5 w-5 text-brand-600" />
              <h2 className="text-lg font-semibold text-gray-900">Perfil público</h2>
            </div>
            {isLoading ? (
              <p className="text-sm text-gray-400">Cargando…</p>
            ) : (
              <>
                <Input id="mv-name" label="Nombre del venue *" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <div>
                  <label className="text-sm font-medium text-gray-700">Descripción</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Cuéntale a tus clientes qué hace especial a tu venue…"
                  />
                </div>
                <Input id="mv-logo" label="Logo (URL de imagen)" value={form.logo_url}
                  onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                  placeholder="https://…/logo.png" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input id="mv-ig" label="Instagram" value={form.instagram}
                    onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
                    placeholder="@tuvenue" />
                  <Input id="mv-fb" label="Facebook" value={form.facebook}
                    onChange={e => setForm(f => ({ ...f, facebook: e.target.value }))}
                    placeholder="https://facebook.com/tuvenue" />
                  <Input id="mv-wa" label="WhatsApp" value={form.whatsapp}
                    onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                    placeholder="+57 300 000 0000" />
                  <Input id="mv-web" label="Sitio web" value={form.website}
                    onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                    placeholder="https://tuvenue.com" />
                </div>
                {err && <p className="text-sm text-red-600">{err}</p>}
                {saved && <p className="text-sm text-green-600">✓ Cambios guardados</p>}
                <Button type="submit" loading={saveMut.isPending}>Guardar cambios</Button>
              </>
            )}
          </form>
        </Card>

        {/* Plan (solo lectura). id="plan": destino del botón "Mejorar mi plan" */}
        <Card className="scroll-mt-6" id="plan">
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Tu plan</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{PLAN_LABELS[plan]}</p>
                <p className="text-xs text-gray-500">
                  {limit !== null ? `Hasta ${limit.toLocaleString('es-CO')} boletas/mes` : 'Boletas ilimitadas'}
                  {plan === 'starter' ? ' · solo eventos gratuitos' : ''}
                </p>
              </div>
              <Badge label={badge.label} variant={badge.variant} />
            </div>

            <div className="border-t pt-4">
              {planSent ? (
                <p className="text-sm text-green-600">
                  ✓ Solicitud enviada. Te contactaremos muy pronto para coordinar el cambio de plan.
                </p>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-2">
                    ¿Necesitas más boletas o eventos pagos? Cuéntanos y coordinamos el cambio contigo.
                  </p>
                  <textarea
                    value={planMsg}
                    onChange={e => setPlanMsg(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Ej: quiero pasarme a Grow"
                  />
                  {planErr && <p className="text-sm text-red-600 mb-2">{planErr}</p>}
                  <Button type="button" variant="secondary" className="w-full" onClick={requestPlanChange}>
                    <Send className="h-4 w-4 mr-1" /> Quiero cambiar de plan
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
