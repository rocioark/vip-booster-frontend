'use client'
import { useState, FormEvent, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { publicApi } from '@/lib/public-api'
import { ID_TYPES, type VipPackage } from '@/lib/types'
import Link from 'next/link'
import { ArrowLeft, Lock, CheckCircle2 } from 'lucide-react'
import { AxiosError } from 'axios'

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

// Precio 0 = paquete gratuito
function fmtPrice(n: number) {
  return Number(n) > 0 ? fmt(n) : 'Gratis'
}

const PAYMENT_METHODS = [
  { value: 'card', label: 'Tarjeta crédito/débito' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'pse', label: 'PSE' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
]

function CheckoutForm({ venueSlug, eventSlug }: { venueSlug: string; eventSlug: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pkgId = searchParams.get('pkg') ?? ''
  const eventId = searchParams.get('event') ?? ''
  const venueId = searchParams.get('venue') ?? ''

  const [step, setStep] = useState<'form' | 'done'>('form')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    id_type: 'CC',
    id_number: '',
    payment_method: 'card',
    discount_code: '',
  })
  const [discount, setDiscount] = useState<{ amount: number; type: string } | null>(null)
  const [discountErr, setDiscountErr] = useState('')
  const [err, setErr] = useState('')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderCompleted, setOrderCompleted] = useState(false)
  const [wompiUrl, setWompiUrl] = useState<string | null>(null)

  const { data: pkg, isLoading } = useQuery<VipPackage | undefined>({
    queryKey: ['public-pkg', pkgId, eventId],
    queryFn: async () => {
      const r = await publicApi.getPackages(eventId)
      return (r.data as VipPackage[]).find(p => p.id === pkgId)
    },
    enabled: !!pkgId && !!eventId,
  })

  const subtotal = pkg?.price ?? 0

  async function applyDiscount() {
    setDiscountErr('')
    setDiscount(null)
    if (!form.discount_code.trim()) return
    try {
      // API calculates discount_amount for us; subtotal is required.
      // Un código inválido responde 200 con valid=false (no lanza error HTTP).
      const r = await publicApi.validateDiscount(form.discount_code.trim(), venueId, subtotal, eventId)
      if (!r.data.valid) {
        setDiscountErr(r.data.message || 'Código inválido o expirado')
        return
      }
      setDiscount({ amount: Number(r.data.discount_amount), type: r.data.discount_type })
    } catch {
      setDiscountErr('Código inválido o expirado')
    }
  }

  // API already returns the final discount_amount — use it directly
  const discountAmt = discount ? Math.min(discount.amount, subtotal) : 0
  const total = Math.max(0, subtotal - discountAmt)

  const orderMut = useMutation({
    mutationFn: async () => {
      const custRes = await publicApi.createCustomer({
        venue_id: venueId,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || null,
        id_type: form.id_number ? form.id_type : null,
        id_number: form.id_number || null,
      })
      const customerId = custRes.data.id

      const orderRes = await publicApi.createOrder({
        venue_id: venueId,
        event_id: eventId,
        customer_id: customerId,
        payment_method: form.payment_method,
        sales_channel: 'online',
        discount_code: form.discount_code || null,
        items: [{ vip_package_id: pkgId, quantity: 1 }],
        // El portador del ticket es quien compra (sale en el PDF y el check-in)
        holder_name: form.full_name,
        holder_email: form.email,
        holder_phone: form.phone || null,
        // Documento del portador: sale impreso en el PDF y se pide en la puerta
        holder_id_type: form.id_number ? form.id_type : null,
        holder_id_number: form.id_number || null,
      })
      return orderRes.data
    },
    onSuccess: (data) => {
      setOrderId(data.id)
      // Órdenes gratuitas: el backend las completa al crearse
      setOrderCompleted(data.payment_status === 'completed')
      if (data.wompi_payment_url) setWompiUrl(data.wompi_payment_url)
      setStep('done')
    },
    onError: (e: AxiosError<{ detail: string }>) => {
      setErr(e.response?.data?.detail ?? 'Error al procesar la orden. Intenta de nuevo.')
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.full_name || !form.email) { setErr('Nombre y email son requeridos'); return }
    setErr('')
    orderMut.mutate()
  }

  if (step === 'done') {
    return (
      <div className="max-w-lg mx-auto text-center py-16 px-4">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-900/50 border border-green-500 mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-400" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">
          {orderCompleted ? '¡Boletas confirmadas!' : '¡Orden creada!'}
        </h1>
        <p className="text-gray-400 mb-8">
          {orderCompleted
            ? 'Tu orden gratuita quedó confirmada: no hay nada que pagar. Tus tickets con QR llegan a tu email.'
            : 'Revisa tu email para los detalles.'}
        </p>
        {wompiUrl ? (
          <div className="space-y-4">
            <a
              href={wompiUrl}
              className="block bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 rounded-xl transition-colors"
            >
              Pagar ahora con Wompi →
            </a>
            <button
              onClick={() => router.push(`/${venueSlug}/confirmacion?order=${orderId}`)}
              className="block w-full text-sm text-gray-500 hover:text-gray-300"
            >
              Ver detalles de la orden
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push(`/${venueSlug}/confirmacion?order=${orderId}`)}
            className="bg-brand-600 hover:bg-brand-500 text-white font-bold px-8 py-4 rounded-xl transition-colors"
          >
            Ver mis tickets →
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href={`/${venueSlug}/${eventSlug}`} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Volver a packages
      </Link>

      <h1 className="text-3xl font-black text-white mb-8">Completa tu compra</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Package summary */}
        {isLoading ? (
          <div className="h-24 bg-gray-800 rounded-2xl animate-pulse" />
        ) : pkg && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
            <p className="text-xs text-brand-400 uppercase tracking-wider mb-1">Package seleccionado</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-white">{pkg.name}</p>
                <p className="text-sm text-gray-400">Tier {pkg.tier_level}</p>
              </div>
              <p className="text-xl font-black text-brand-400">{fmtPrice(pkg.price)}</p>
            </div>
          </div>
        )}

        {/* Customer info */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Tus datos</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Nombre completo *</label>
              <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Juan Rodríguez"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm text-gray-400 mb-1">Email *</label>
              <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="juan@email.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm text-gray-400 mb-1">Teléfono</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="3001234567"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tipo de documento</label>
              <select value={form.id_type} onChange={e => setForm(f => ({ ...f, id_type: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500">
                {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Número de documento</label>
              <input value={form.id_number} onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))}
                placeholder="1234567890"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500" />
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Método de pago</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PAYMENT_METHODS.map(pm => (
              <button key={pm.value} type="button" onClick={() => setForm(f => ({ ...f, payment_method: pm.value }))}
                className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                  form.payment_method === pm.value
                    ? 'bg-brand-900 border-brand-500 text-brand-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}>
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Discount */}
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white">Código de descuento</h2>
          <div className="flex gap-3">
            <input
              value={form.discount_code}
              onChange={e => { setForm(f => ({ ...f, discount_code: e.target.value.toUpperCase() })); setDiscountErr(''); setDiscount(null) }}
              placeholder="PROMO20"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 font-mono uppercase"
            />
            <button type="button" onClick={applyDiscount}
              className="bg-gray-700 hover:bg-gray-600 text-white px-5 rounded-xl text-sm font-medium transition-colors">
              Aplicar
            </button>
          </div>
          {discountErr && <p className="text-red-400 text-sm">{discountErr}</p>}
          {discount && (
            <p className="text-green-400 text-sm">✓ Descuento aplicado: -{fmt(discount.amount)}</p>
          )}
        </div>

        {/* Summary */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5 space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Subtotal — {pkg?.name}</span>
            <span>{fmt(subtotal)}</span>
          </div>
          {discountAmt > 0 && (
            <div className="flex justify-between text-sm text-green-400">
              <span>Descuento</span>
              <span>-{fmt(discountAmt)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-black text-white border-t border-gray-700 pt-2 mt-2">
            <span>Total</span>
            <span className="text-brand-400">{fmt(total)}</span>
          </div>
        </div>

        {err && (
          <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 text-red-300 text-sm">{err}</div>
        )}

        <button
          type="submit"
          disabled={orderMut.isPending || !pkg}
          className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {orderMut.isPending ? (
            <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><Lock className="h-5 w-5" /> Confirmar orden — {fmt(total)}</>
          )}
        </button>

        <p className="text-center text-xs text-gray-600">
          Transacción segura · Tus datos están protegidos
        </p>
      </form>
    </div>
  )
}

interface PageProps {
  params: { 'venue-slug': string; 'event-slug': string }
}

export default function CheckoutPage({ params }: PageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <span className="h-8 w-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckoutForm venueSlug={params['venue-slug']} eventSlug={params['event-slug']} />
    </Suspense>
  )
}
