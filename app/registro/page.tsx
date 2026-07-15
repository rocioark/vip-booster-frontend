'use client'
import { useState, ChangeEvent, FormEvent, Suspense } from 'react'
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

// Versión para tipeo en vivo: transforma carácter a carácter sin colapsar ni
// recortar guiones, para poder recalcular la posición del cursor.
function sanitizeSlugLive(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s/g, '-').replace(/[^a-z0-9-]/g, '')
}

// FastAPI devuelve los errores de validación (422) como lista, no string.
const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre del venue',
  slug: 'URL de tu tienda',
  owner_name: 'Tu nombre',
  full_name: 'Tu nombre',
  owner_email: 'Email',
  email: 'Email',
  password: 'Contraseña',
  phone: 'Teléfono',
}

type ValidationItem = { loc: (string | number)[]; msg: string }

function errorMessage(e: unknown): string {
  const res = (e as AxiosError<{ detail: string | ValidationItem[] }>).response
  if (!res) return 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.'
  if (res.status === 429) return 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.'
  const detail = res.data?.detail
  // 400 del backend: "Slug '...' ya está en uso", "Email '...' ya está registrado", etc.
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const d = detail[0]
    const field = [...d.loc].reverse().find(p => typeof p === 'string' && p !== 'body')
    const label = FIELD_LABELS[field as string] ?? field ?? ''
    const msg = d.msg.replace(/^Value error,\s*/i, '')
    return label ? `${label}: ${msg}` : msg
  }
  return 'No se pudo completar el registro. Intenta de nuevo.'
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
  // Mientras el usuario no edite el slug a mano, se sugiere desde el nombre.
  const [slugTouched, setSlugTouched] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingDone, setPendingDone] = useState(false)

  function handleSlugChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const pos = input.selectionStart ?? input.value.length
    const clean = sanitizeSlugLive(input.value)
    // El cursor se reubica según cuántos caracteres sobrevivieron antes de él,
    // así editar en medio del slug no lo manda al final.
    const newPos = sanitizeSlugLive(input.value.slice(0, pos)).length
    setSlugTouched(true)
    setForm(f => ({ ...f, slug: clean }))
    requestAnimationFrame(() => input.setSelectionRange(newPos, newPos))
  }

  function handleSlugBlur() {
    const normalized = slugify(form.slug)
    if (!normalized) setSlugTouched(false)
    setForm(f => ({ ...f, slug: normalized }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    const slug = slugify(form.slug)
    if (!form.venue_name || !slug || !form.owner_name || !form.email) { setErr('Completa todos los campos obligatorios'); return }
    if (slug.length < 3) { setErr('La URL de tu tienda debe tener al menos 3 caracteres.'); return }
    if (form.password.length < 8 || !/[a-zA-Z]/.test(form.password) || !/\d/.test(form.password)) {
      setErr('La contraseña debe tener mínimo 8 caracteres e incluir al menos una letra y un número.'); return
    }
    if (form.password !== form.password2) { setErr('Las contraseñas no coinciden'); return }
    setLoading(true)
    try {
      const r = await venuesApi.register({
        name: form.venue_name,
        slug,
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
              slug,
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
      setErr(errorMessage(e))
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
    <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
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
          <Input id="r-venue" label="Nombre del venue *" value={form.venue_name} autoComplete="off"
            onChange={e => {
              const v = e.target.value
              setForm(f => ({ ...f, venue_name: v, ...(slugTouched ? {} : { slug: slugify(v) }) }))
            }}
            placeholder="Armando Records" />
          <div className="flex flex-col gap-1">
            <label htmlFor="r-slug" className="text-sm font-medium text-gray-700">URL de tu tienda *</label>
            <div className="flex items-stretch rounded-lg border border-gray-300 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500">
              <span className="flex items-center bg-gray-50 border-r border-gray-200 px-3 text-sm text-gray-500 select-none">
                kythos.vip/
              </span>
              <input id="r-slug" value={form.slug} onChange={handleSlugChange} onBlur={handleSlugBlur}
                autoComplete="off" spellCheck={false}
                className="flex-1 min-w-0 px-3 py-2 text-sm focus:outline-none"
                placeholder="armando-records" />
            </div>
            <p className="text-xs text-gray-400">Se sugiere sola desde el nombre; puedes editarla.</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">Tus datos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input id="r-owner" label="Tu nombre *" value={form.owner_name} autoComplete="off"
            onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} />
          <Input id="r-email" label="Email *" type="email" value={form.email}
            name="registro-owner-email" autoComplete="off"
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input id="r-phone" label="Teléfono" value={form.phone} autoComplete="off"
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input id="r-pass" label="Contraseña *" type="password" value={form.password}
            autoComplete="new-password"
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="Mín. 8 caracteres, letra y número" />
          <Input id="r-pass2" label="Confirmar contraseña *" type="password" value={form.password2}
            autoComplete="new-password"
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
