'use client'
import { useState, FormEvent } from 'react'
import Link from 'next/link'

const features = [
  {
    title: 'Paquetes VIP listos para vender',
    description:
      'Crea experiencias, mesas, upgrades y beneficios exclusivos para tus clientes en minutos.',
  },
  {
    title: 'Más ingresos por venue',
    description:
      'Convierte la demanda premium en revenue adicional con una plataforma enfocada en upselling VIP.',
  },
  {
    title: 'Gestión SaaS simple',
    description:
      'Administra solicitudes, contactos y ventas VIP desde una experiencia clara, rápida y responsive.',
  },
]

const pricing = [
  {
    label: 'Starter',
    value: 'Gratis',
    detail: 'Hasta 50 asistentes, eventos gratuitos, check-in QR',
  },
  {
    label: 'Grow',
    value: '9% por boleta',
    detail: 'Sin límite de eventos, tienda pública, analytics, descuentos',
  },
  {
    label: 'Pro',
    value: '9% + $800.000 setup + $200.000/mes',
    detail: 'Soporte prioritario, múltiples venues',
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
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D946EF] text-xl font-black text-white shadow-lg shadow-[#D946EF]/30">
              V
            </span>
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
              <div className="space-y-4">
                {pricing.map((plan) => (
                  <div key={plan.label} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/[0.04] p-4">
                    <div>
                      <p className="font-semibold text-white">{plan.label}</p>
                      <p className="text-sm text-slate-400">Plan VIP Booster</p>
                    </div>
                    <span className="rounded-full bg-[#D946EF]/15 px-3 py-1 text-sm font-semibold text-fuchsia-200">
                      {plan.value}
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
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Modelo simple para crecer revenue VIP</h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {pricing.map((item) => (
              <article
                key={item.label}
                className="rounded-3xl border border-white/10 bg-white/[0.06] p-7 shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:border-[#D946EF]/60"
              >
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
                <p className="mt-4 text-3xl font-black text-white">{item.value}</p>
                <p className="mt-3 text-slate-300">{item.detail}</p>
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
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D946EF]/15 text-xl font-black text-[#D946EF]">
                  V
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
              Activa tu venue hoy
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Te contactamos en menos de 24 horas.
            </p>
          </div>

          <ContactForm />
        </div>
      </section>
    </main>
  )
}
