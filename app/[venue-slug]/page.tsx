'use client'
import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/lib/public-api'
import type { PublicEvent, PublicVenueDetail } from '@/lib/types'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { CalendarDays, MapPin, Clock, Ticket } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function fmtDate(d: string) {
  try { return format(new Date(d), "EEEE d 'de' MMMM yyyy", { locale: es }) } catch { return d }
}

function fmtTime(t: string) {
  return t.slice(0, 5)
}

function EventCard({ event, venueSlug }: { event: PublicEvent; venueSlug: string }) {
  const isSoldOut = event.status === 'sold_out'
  return (
    <Link
      href={isSoldOut ? '#' : `/${venueSlug}/${event.slug}`}
      className={`group block rounded-2xl overflow-hidden border transition-all duration-300 ${
        isSoldOut
          ? 'border-gray-700 cursor-not-allowed opacity-60'
          : 'border-gray-800 hover:border-brand-500 hover:shadow-[0_0_30px_rgba(192,38,211,0.15)]'
      }`}
    >
      <div className="relative h-48 bg-gradient-to-br from-brand-900 via-gray-900 to-gray-800 overflow-hidden">
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
        {!isSoldOut && event.available != null && event.available <= 20 && (
          <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            ¡Últimas {event.available}!
          </div>
        )}
      </div>

      <div className="p-5 space-y-3 bg-gray-900">
        {event.artist_name && (
          <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider">{event.artist_name}</p>
        )}
        <h3 className="text-lg font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-2">
          {event.name}
        </h3>
        <div className="space-y-1.5 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-brand-500 shrink-0" />
            <span className="capitalize">{fmtDate(event.event_date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-500 shrink-0" />
            <span>{fmtTime(event.event_start_time)}</span>
          </div>
          {event.venue_location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-500 shrink-0" />
              <span className="truncate">{event.venue_location}</span>
            </div>
          )}
        </div>
        {!isSoldOut && (
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 bg-brand-950 border border-brand-800 px-3 py-1.5 rounded-full group-hover:bg-brand-900 transition-colors">
              <Ticket className="h-3.5 w-3.5" />
              Ver packages VIP
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

interface PageProps {
  params: { 'venue-slug': string }
}

export default function VenueStorePage({ params }: PageProps) {
  const venueSlug = params['venue-slug']

  const { data, isLoading, isError } = useQuery<PublicVenueDetail>({
    queryKey: ['public-venue', venueSlug],
    queryFn: async () => {
      const r = await publicApi.getVenueBySlug(venueSlug)
      return r.data as PublicVenueDetail
    },
    retry: false,
  })

  if (isError || (!isLoading && !data)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">🎟️</p>
          <h1 className="text-2xl font-bold text-white mb-2">Venue no encontrado</h1>
          <p className="text-gray-400">El enlace puede estar incorrecto o el venue no existe.</p>
        </div>
      </div>
    )
  }

  const events = data?.events ?? []

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="text-center mb-12">
        <Logo className="inline-block h-14 w-14 mb-4" />
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-800 rounded-lg mx-auto animate-pulse" />
            <div className="h-4 w-32 bg-gray-800 rounded mx-auto animate-pulse" />
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-black text-white">{data?.name}</h1>
            <p className="text-gray-400 mt-1">Tickets VIP exclusivos</p>
          </>
        )}
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
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <EventCard key={event.id} event={event} venueSlug={venueSlug} />
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
  )
}
