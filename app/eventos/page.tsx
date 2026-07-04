'use client'
import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/lib/public-api'
import type { PublicEventListItem } from '@/lib/types'
import Link from 'next/link'
import { CalendarDays, MapPin, Clock, Ticket } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function fmtDate(d: string) {
  try { return format(new Date(d), "EEEE d 'de' MMMM yyyy", { locale: es }) } catch { return d }
}

function fmtTime(t: string) {
  return t.slice(0, 5)
}

function EventCard({ event }: { event: PublicEventListItem }) {
  const isSoldOut = event.status === 'sold_out'
  return (
    <Link
      href={isSoldOut ? '#' : `/${event.venue_slug}/${event.slug}`}
      className={`group block rounded-2xl overflow-hidden border transition-all duration-300 ${
        isSoldOut
          ? 'border-gray-800 cursor-not-allowed opacity-60'
          : 'border-gray-800 hover:border-[#D946EF] hover:shadow-[0_0_30px_rgba(217,70,239,0.15)]'
      }`}
    >
      <div className="relative h-48 bg-gradient-to-br from-slate-900 via-gray-900 to-gray-800 overflow-hidden">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt={event.name} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-black text-white/10 uppercase tracking-widest">VIP</span>
          </div>
        )}
        {event.artist_image_url && (
          <img src={event.artist_image_url} alt={event.artist_name ?? ''} className="absolute bottom-0 right-4 h-32 object-contain drop-shadow-2xl" />
        )}
        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="bg-red-600 text-white text-sm font-bold px-4 py-1 rounded-full">AGOTADO</span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-3 bg-gray-900">
        <p className="text-xs font-semibold text-[#D946EF] uppercase tracking-wider">{event.venue_name}</p>
        {event.artist_name && (
          <p className="text-xs text-gray-500">{event.artist_name}</p>
        )}
        <h3 className="text-lg font-bold text-white group-hover:text-fuchsia-300 transition-colors line-clamp-2">
          {event.name}
        </h3>
        <div className="space-y-1.5 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#D946EF] shrink-0" />
            <span className="capitalize">{fmtDate(event.event_date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#D946EF] shrink-0" />
            <span>{fmtTime(event.event_start_time)}</span>
          </div>
          {event.venue_location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#D946EF] shrink-0" />
              <span className="truncate">{event.venue_location}</span>
            </div>
          )}
        </div>
        {!isSoldOut && (
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-fuchsia-300 bg-[#D946EF]/10 border border-[#D946EF]/30 px-3 py-1.5 rounded-full group-hover:bg-[#D946EF]/20 transition-colors">
              <Ticket className="h-3.5 w-3.5" />
              Comprar
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

export default function EventosPage() {
  const { data, isLoading, isError } = useQuery<PublicEventListItem[]>({
    queryKey: ['public-events'],
    queryFn: async () => {
      const r = await publicApi.listEvents({ limit: 50 })
      return r.data as PublicEventListItem[]
    },
    retry: false,
  })

  const events = data ?? []

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="px-6 py-8 sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="VIP Booster inicio">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D946EF] text-xl font-black text-white shadow-lg shadow-[#D946EF]/30">
              V
            </span>
            <span className="text-lg font-bold tracking-tight">VIP Booster</span>
          </Link>
          <Link
            href="/#contacto"
            className="hidden rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-[#D946EF] hover:bg-[#D946EF]/10 sm:inline-flex"
          >
            Quiero empezar
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6 pb-16">
        <div className="text-center mb-12">
          <div className="mb-4 inline-flex rounded-full border border-[#D946EF]/30 bg-[#D946EF]/10 px-4 py-2 text-sm font-medium text-fuchsia-100">
            Eventos activos
          </div>
          <h1 className="text-3xl font-black text-white">Todos los eventos VIP</h1>
          <p className="text-gray-400 mt-1">Elige tu evento y compra tus tickets VIP</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-gray-800">
                <div className="h-48 bg-gray-800 animate-pulse" />
                <div className="p-5 space-y-3 bg-gray-900">
                  <div className="h-4 w-24 bg-gray-800 rounded animate-pulse" />
                  <div className="h-6 w-full bg-gray-800 rounded animate-pulse" />
                  <div className="h-4 w-40 bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-20">
            <p className="text-gray-500">No se pudieron cargar los eventos.</p>
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <CalendarDays className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No hay eventos disponibles por ahora</p>
            <p className="text-gray-600 text-sm mt-1">Vuelve pronto para ver los próximos eventos</p>
          </div>
        )}

        <footer className="mt-16 text-center text-xs text-gray-700">
          Powered by VIP Booster
        </footer>
      </div>
    </main>
  )
}
