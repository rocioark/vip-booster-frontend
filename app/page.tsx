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
    label: 'Setup fee',
    value: '$800.000 COP',
    detail: 'Pago único de implementación',
  },
  {
    label: 'Mensualidad',
    value: '$200.000 COP',
    detail: 'Soporte y acceso a la plataforma',
  },
  {
    label: 'Comisión',
    value: '10%',
    detail: 'Sobre el revenue VIP generado',
  },
]

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <section className="relative isolate px-6 py-8 sm:px-10 lg:px-16">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(217,70,239,0.26),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.22),_transparent_30%)]" />
        <div className="absolute left-1/2 top-0 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-[#D946EF]/20 blur-3xl" />

        <nav className="mx-auto flex max-w-7xl items-center justify-between">
          <a href="#top" className="flex items-center gap-3" aria-label="VIP Booster inicio">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D946EF] text-xl font-black text-white shadow-lg shadow-[#D946EF]/30">
              V
            </span>
            <span className="text-lg font-bold tracking-tight">VIP Booster</span>
          </a>
          <a
            href="#contacto"
            className="hidden rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-[#D946EF] hover:bg-[#D946EF]/10 sm:inline-flex"
          >
            Solicitar Demo
          </a>
        </nav>

        <div id="top" className="mx-auto grid max-w-7xl items-center gap-12 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-[#D946EF]/30 bg-[#D946EF]/10 px-4 py-2 text-sm font-medium text-fuchsia-100">
              Plataforma SaaS para venues
            </div>
            <h1 className="max-w-4xl text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
              VIP Booster
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-slate-300 sm:text-2xl">
              Plataforma SaaS para venues — vende paquetes VIP y aumenta ingresos 30-50%
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a
                href="#contacto"
                className="inline-flex items-center justify-center rounded-full bg-[#D946EF] px-8 py-4 text-base font-bold text-white shadow-xl shadow-[#D946EF]/30 transition hover:-translate-y-0.5 hover:bg-fuchsia-500"
              >
                Solicitar Demo
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
                {['Mesa premium', 'Botella + acceso', 'Upgrade experiencia'].map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-2xl bg-white/[0.04] p-4">
                    <div>
                      <p className="font-semibold text-white">{item}</p>
                      <p className="text-sm text-slate-400">Paquete VIP #{index + 1}</p>
                    </div>
                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                      Activo
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
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#D946EF]">Demo</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Solicita una demo para tu venue
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Cuéntanos sobre tu venue y te mostramos cómo VIP Booster puede ayudarte a vender paquetes VIP y aumentar ingresos.
            </p>
          </div>

          <form className="rounded-3xl bg-slate-950/80 p-6 ring-1 ring-white/10" action="mailto:contacto@kythos.vip" method="post" encType="text/plain">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sr-only" htmlFor="nombre">Nombre</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                required
                placeholder="Nombre"
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-[#D946EF]"
              />
              <label className="sr-only" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="Email"
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-[#D946EF]"
              />
              <label className="sr-only" htmlFor="telefono">Teléfono</label>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                required
                placeholder="Teléfono"
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-[#D946EF] sm:col-span-2"
              />
              <label className="sr-only" htmlFor="mensaje">Mensaje</label>
              <textarea
                id="mensaje"
                name="mensaje"
                required
                placeholder="Mensaje"
                rows={5}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-[#D946EF] sm:col-span-2"
              />
            </div>
            <button
              type="submit"
              className="mt-5 w-full rounded-full bg-[#D946EF] px-8 py-4 text-base font-black text-white shadow-xl shadow-[#D946EF]/30 transition hover:-translate-y-0.5 hover:bg-fuchsia-500"
            >
              Solicitar Demo
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
