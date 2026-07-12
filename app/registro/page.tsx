'use client'
import { useState, FormEvent, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AxiosError } from 'axios'
import { Check, Clock } from 'lucide-react'
import { venuesApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/Logo'
import { PLAN_LABELS, type VenuePlan } from '@/lib/types'

function slugify(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

const PLANS: { value: VenuePlan; price: string; note: string; features: string[] }[] = [
  { value: 'starter', price: 'Gratis', note: 'para siempre', features: ['Hasta 50 boletas/mes', 'Solo eventos gratuitos', 'Check-in QR incluido'] },
  { value: 'grow', price: '9%', note: 'por boleta · sin mensualidad', features: ['Hasta 500 boletas/mes', 'Tienda pública', 'Analytics y descuentos'] },
  { value: 'pro_monthly', price: '$250.000', note: '/mes + 9% por boleta', features: ['Hasta 2.000 boletas/mes', 'Todo lo de Grow', 'Soporte prioritario'] },
  { value: 'pro_annual', price: '$2.400.000', note: '/año + 9% por boleta', features: ['Boletas ilimitadas', 'Todo lo de Pro', 'Soporte dedicado'] },
]

function RegistroForm() {
  const params = useSearchParams()
  const initialPlan = (params.get('plan') as VenuePlan) || 'starter'
  const { login } = useAuth()

  const [plan, setPlan] = useState<VenuePlan>(PLAN_LABELS[initialPlan] ? initialPlan : 'starter')
  const [form, setForm] = useState({
    venue_name: '', slug: '', owner_name: '', email: '', phone: '', password: '', password2: '',
  })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingDone, setPendingDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    if (!form.venue_name || !form.slug || !form.owner_name || !form.email) { setErr('Completa todos los campos obligatorios'); return }
    if (form.password !== form.password2) { setErr('Las contraseñas no coinciden'); return }
    setLoading(true)
    try {
      const r = await venuesApi.register({
        name: form.venue_name,
        slug: form.slug,
        owner_name: form.owner_name,
        owner_email: form.email,
        plan,
        owner_user: {
          email: form.email,
          full_name: form.owner_name,
          password: form.password,
          phone: form.phone || null,
        },
      })

      if (r.data.pending_activation) {
        // Plan de pago: notificar al equipo (best-effort, no bloquea el flujo)
        try {
          await fetch('/api/venue-lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              venue_name: form.venue_name,
              slug: form.slug,
              plan: PLAN_LABELS[plan],
              owner_name: form.owner_name,
              owner_email: form.email,
              phone: form.phone,
            }),
          })
        } catch { /* la notificación no debe romper el registro */ }
        setPendingDone(true)
      } else {
        // Starter: directo a su panel
        await login(form.email, form.password)
      }
    } catch (e) {
      const detail = (e as AxiosError<{ detail: string }>).response?.data?.detail
      setErr(typeof detail === 'string' ? detail : 'No se pudo completar el registro. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (pendingDone) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
        <Clock className="h-12 w-12 text-brand-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">¡Tu venue quedó registrado!</h2>
        <p className="text-sm text-gray-600 mb-4">
          Elegiste el plan <strong>{PLAN_LABELS[plan]}</strong>. Tu venue está{' '}
          <strong>pendiente de activación</strong>: te contactaremos muy pronto al correo{' '}
          <strong>{form.email}</strong> para coordinar el pago y activarlo.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          Ya puedes iniciar sesión para ir preparando tus eventos; la tienda pública se
          habilita al activar el plan.
        </p>
        <Link href="/login"><Button>Ir a iniciar sesión</Button></Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selección de plan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PLANS.map(p => (
          <button
            type="button"
            key={p.value}
            onClick={() => setPlan(p.value)}
            className={`text-left rounded-xl border-2 p-4 transition ${
              plan === p.value ? 'border-brand-600 bg-brand-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className="font-semibold text-gray-900 text-sm">{PLAN_LABELS[p.value]}</p>
            <p className="text-lg font-bold text-gray-900">{p.price}</p>
            <p className="text-xs text-gray-500 mb-2">{p.note}</p>
            <ul className="space-y-1">
              {p.features.map(f => (
                <li key={f} className="flex items-start gap-1 text-xs text-gray-600">
                  <Check className="h-3 w-3 mt-0.5 shrink-0 text-brand-600" />{f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
      {plan !== 'starter' && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Los planes de pago no se cobran online: registras tu venue hoy y te contactamos
          para coordinar el pago y activarlo.
        </p>
      )}

      {/* Datos */}
      <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Datos de tu venue</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input id="r-venue" label="Nombre del venue *" value={form.venue_name}
            onChange={e => { const v = e.target.value; setForm(f => ({ ...f, venue_name: v, slug: slugify(v) })) }}
            placeholder="Armando Records" />
          <Input id="r-slug" label="URL de tu tienda *" value={form.slug}
            onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
            placeholder="armando-records" />
        </div>
        <p className="text-xs text-gray-400 -mt-2">Tu tienda quedará en kythos.vip/{form.slug || 'tu-venue'}</p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">Tus datos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input id="r-owner" label="Tu nombre *" value={form.owner_name}
            onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} />
          <Input id="r-email" label="Email *" type="email" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input id="r-phone" label="Teléfono" value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input id="r-pass" label="Contraseña *" type="password" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="Mín. 8 caracteres, letra y número" />
          <Input id="r-pass2" label="Confirmar contraseña *" type="password" value={form.password2}
            onChange={e => setForm(f => ({ ...f, password2: e.target.value }))} />
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button type="submit" loading={loading} className="w-full">
          {plan === 'starter' ? 'Crear mi venue gratis' : `Registrar con plan ${PLAN_LABELS[plan]}`}
        </Button>
        <p className="text-xs text-center text-gray-400">
          ¿Ya tienes cuenta? <Link href="/login" className="text-brand-600 hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </form>
  )
}

export default function RegistroPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-gray-900 to-gray-800 p-4 py-10">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/para-venues"><Logo className="inline-block h-12 w-12 mb-3" /></Link>
          <h1 className="text-2xl font-bold text-white">Crea tu venue</h1>
          <p className="text-gray-400 text-sm mt-1">Empieza a vender boletas VIP en minutos</p>
        </div>
        <Suspense fallback={null}>
          <RegistroForm />
        </Suspense>
      </div>
    </div>
  )
}
