'use client'
import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { Tag, TrendingUp, LayoutDashboard, Check } from 'lucide-react'

const features = [
  {
    title: 'Paquetes VIP listos para vender',
    description:
      'Crea experiencias, mesas, upgrades y beneficios exclusivos para tus clientes en minutos.',
    icon: Tag,
  },
  {
    title: 'Más ingresos por venue',
    description:
      'Convierte la demanda premium en revenue adicional con una plataforma enfocada en upselling VIP.',
    icon: TrendingUp,
  },
  {
    title: 'Gestión SaaS simple',
    description:
      'Administra solicitudes, contactos y ventas VIP desde una experiencia clara, rápida y responsive.',
    icon: LayoutDashboard,
  },
]

interface PricingPlan {
  label: string
  price: string
  priceNote: string
  shortPrice: string
  features: string[]
  cta: string
  highlighted: boolean
  badge: string | null
  savings: string | null
}

const pricing: PricingPlan[] = [
  {
    label: 'Starter',
    price: 'Gratis',
    priceNote: '',
    shortPrice: 'Gratis',
    features: ['Hasta 50 boletas/mes', 'Solo eventos gratuitos', 'Check-in QR incluido'],
    cta: 'Empezar gratis',
    highlighted: false,
    badge: null,
    savings: null,
  },
  {
    label: 'Grow',
    price: '9%',
    priceNote: 'por boleta vendida · sin mensualidad',
    shortPrice: '9% por boleta',
    features: ['Hasta 500 boletas/mes', 'Tienda pública', 'Analytics y descuentos'],
    cta: 'Elegir Grow',
    highlighted: false,
    badge: null,
    savings: null,
  },
  {
    label: 'Pro Mensual',
    price: '$250.000',
    priceNote: '/mes + 9% por boleta',
    shortPrice: '$250.000/mes',
    features: ['Hasta 2.000 boletas/mes', 'Todo lo de Grow', 'Soporte prioritario'],
    cta: 'Elegir Pro',
    highlighted: true,
    badge: 'Recomendado',
    savings: null,
  },
  {
    label: 'Pro Anual',
    price: '$2.400.000',
    priceNote: '/año + 9% por boleta',
    shortPrice: '$2,4M/año',
    features: ['Boletas ilimitadas', 'Todo lo de Pro', 'Múltiples venues + soporte dedicado'],
    cta: 'Elegir Pro Anual',
    highlighted: false,
    badge: null,
    savings: 'Equivale a $200.000/mes — ahorras $600.000 al año vs. Pro Mensual',
  },
]

function ContactForm() {
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', venue: '', ciudad: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail ?? 'No se pudo enviar el mensaje')
      }
      setStatus('success')
      setForm({ nombre: '', email: '', telefono: '', venue: '', ciudad: '' })
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-3xl bg-slate-950/80 p-6 text-center ring-1 ring-white/10">
        <p className="text-2xl font-black text-white">¡Listo!</p>
        <p className="mt-3 text-slate-300">
          Recibimos tu solicitud. Te contactaremos pronto para ayudarte a empezar.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl bg-slate-950/80 p-6 ring-1 ring-white/10">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sr-only" htmlFor="nombre">Nombre</label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          placeholder="Nombre"
          value={form.nombre}
          onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-[#D946EF]"
        />
        <label className="sr-only" htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-[#D946EF]"
        />
        <label className="sr-only" htmlFor="telefono">Teléfono</label>
        <input
          id="telefono"
          name="telefono"
          type="tel"
          required
          placeholder="Teléfono"
          value={form.telefono}
          onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
          className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-[#D946EF]"
        />
        <label className="sr-only" htmlFor="venue">Nombre del venue</label>
        <input
          id="venue"
          name="venue"
          type="text"
          required
          placeholder="Nombre del venue"
          value={form.venue}
          onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
          className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-[#D946EF]"
        />
        <label className="sr-only" htmlFor="ciudad">Ciudad</label>
        <input
          id="ciudad"
          name="ciudad"
          type="text"
          required
          placeholder="Ciudad"
          value={form.ciudad}
          onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
          className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-[#D946EF] sm:col-span-2"
        />
      </div>

      {status === 'error' && (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="mt-5 w-full rounded-full bg-[#D946EF] px-8 py-4 text-base font-black text-white shadow-xl shadow-[#D946EF]/30 transition hover:-translate-y-0.5 hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'loading' ? 'Enviando…' : 'Quiero empezar'}
      </button>
    </form>
  )
}

export default function ParaVenuesPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <section className="relative isolate px-6 py-8 sm:px-10 lg:px-16">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(217,70,239,0.26),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.22),_transparent_30%)]" />
        <div className="absolute left-1/2 top-0 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-[#D946EF]/20 blur-3xl" />

        <nav className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="VIP Booster inicio">
            <Logo className="h-11 w-11 shadow-lg shadow-[#D946EF]/30" />
            <span className="text-lg font-bold tracking-tight">VIP Booster</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-semibold text-slate-300 transition hover:text-white"
            >
              Eventos
            </Link>
            <a
              href="#contacto"
              className="hidden rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-[#D946EF] hover:bg-[#D946EF]/10 sm:inline-flex"
            >
              Quiero empezar
            </a>
          </div>
        </nav>

        <div id="top" className="mx-auto grid max-w-7xl items-center gap-12 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-[#D946EF]/30 bg-[#D946EF]/10 px-4 py-2 text-sm font-medium text-fuchsia-100">
              Plataforma SaaS para venues
            </div>
            <h1 className="max-w-4xl text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
              La plataforma VIP para tus eventos
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-slate-300 sm:text-2xl">
              Vende paquetes VIP, gestiona tu boletería y aumenta tus ingresos con Kythos VIP Booster
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a
                href="#contacto"
                className="inline-flex items-center justify-center rounded-full bg-[#D946EF] px-8 py-4 text-base font-bold text-white shadow-xl shadow-[#D946EF]/30 transition hover:-translate-y-0.5 hover:bg-fuchsia-500"
              >
                Quiero empezar
              </a>
              <a
                href="#precios"
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-8 py-4 text-base font-bold text-white transition hover:border-[#D946EF] hover:bg-white/5"
              >
                Ver precios
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="rounded-[1.5rem] bg-slate-900/90 p-6 ring-1 ring-white/10">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Revenue VIP potencial</p>
                  <p className="text-3xl font-black text-white">+30-50%</p>
                </div>
                <span className="rounded-full bg-[#D946EF]/15 px-4 py-2 text-sm font-bold text-fuchsia-200">
                  Live SaaS
                </span>
              </div>
              <div className="space-y-2">
                {pricing.map((plan) => (
                  <div key={plan.label} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-2.5">
                    <p className="text-sm font-semibold text-white">{plan.label}</p>
                    <span className="rounded-full bg-[#D946EF]/15 px-3 py-1 text-xs font-semibold text-fuchsia-200 whitespace-nowrap">
                      {plan.shortPrice}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="precios" className="px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#D946EF]">Precios</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Elige el plan ideal para tu venue</h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4 lg:items-start">
            {pricing.map((plan) => (
              <article
                key={plan.label}
                className={`relative flex flex-col rounded-3xl border p-7 shadow-xl transition hover:-translate-y-1 ${
                  plan.highlighted
                    ? 'border-2 border-[#D946EF] bg-white/[0.08] shadow-[0_0_45px_rgba(217,70,239,0.35)] lg:scale-105'
                    : 'border-white/10 bg-white/[0.06] shadow-black/10 hover:border-[#D946EF]/60'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#D946EF] px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-[#D946EF]/40">
                    {plan.badge}
                  </span>
                )}

                <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">{plan.label}</p>

                <div className="mt-4">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  {plan.priceNote && (
                    <span className="ml-1.5 text-sm font-semibold text-slate-400">{plan.priceNote}</span>
                  )}
                </div>

                {plan.savings && (
                  <p className="mt-2 text-xs font-semibold text-emerald-400">{plan.savings}</p>
                )}

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D946EF]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#contacto"
                  className={`mt-8 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold transition ${
                    plan.highlighted
                      ? 'bg-[#D946EF] text-white shadow-lg shadow-[#D946EF]/30 hover:-translate-y-0.5 hover:bg-fuchsia-500'
                      : 'border border-white/15 text-white hover:border-[#D946EF] hover:bg-[#D946EF]/10'
                  }`}
                >
                  {plan.cta}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-3xl border border-white/10 bg-slate-900/70 p-7">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D946EF]/15 text-[#D946EF]">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-black text-white">{feature.title}</h3>
                <p className="mt-3 leading-7 text-slate-300">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className="px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-10 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur md:grid-cols-[0.9fr_1.1fr] md:p-10">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#D946EF]">Activa tu venue</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Activa tu venue
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Te contactamos en menos de 24 horas
            </p>
          </div>

          <ContactForm />
        </div>
      </section>
    </main>
  )
}
