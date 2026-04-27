'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/lib/public-api'
import type { PublicVenueDetail, VipPackage } from '@/lib/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, MapPin, Clock, ArrowLeft, Zap, Star } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function fmtDate(d: string) {
  try { return format(new Date(d), "EEEE d 'de' MMMM yyyy", { locale: es }) } catch { return d }
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function PackageCard({ pkg, selected, onSelect }: { pkg: VipPackage; selected: boolean; onSelect: () => void }) {
  const features = Object.entries(pkg.features ?? {})
  const soldPct = Math.min(100, Math.round(pkg.sold_percentage ?? 0))

  return (
    <button
      onClick={onSelect}
      disabled={pkg.is_sold_out || !pkg.is_active}
      className={`w-full text-left rounded-2xl border-2 p-6 transition-all duration-200 ${
        pkg.is_sold_out || !pkg.is_active
          ? 'border-gray-800 opacity-50 cursor-not-allowed bg-gray-900/50'
          : selected
          ? 'border-brand-500 bg-brand-950 shadow-[0_0_25px_rgba(192,38,211,0.2)]'
          : 'border-gray-700 bg-gray-900 hover:border-brand-600 hover:bg-gray-800/80'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {pkg.tier_level === 1 && <Zap className="h-4 w-4 text-yellow-400" />}
            {pkg.tier_level >= 2 && <Star className="h-4 w-4 text-brand-400" />}
            <span className="text-xs text-gray-400 uppercase tracking-wider">Tier {pkg.tier_level}</span>
          </div>
          <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
          {pkg.description && <p className="text-sm text-gray-400 mt-1">{pkg.description}</p>}
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-2xl font-black text-brand-400">{fmt(pkg.price)}</p>
          {pkg.is_sold_out ? (
            <span className="text-xs font-bold text-red-400">AGOTADO</span>
          ) : (
            <span className="text-xs text-gray-500">{pkg.quantity_available} disp.</span>
          )}
        </div>
      </div>

      {features.length > 0 && (
        <ul className="space-y-1 mb-4">
          {features.map(([k, v]) => (
            <li key={k} className="flex items-center gap-2 text-sm text-gray-300">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />
              <span className="capitalize">{k.replace(/_/g, ' ')}: {String(v)}</span>
            </li>
          ))}
        </ul>
      )}

      {!pkg.is_sold_out && soldPct > 0 && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{soldPct}% vendido</span>
            {soldPct >= 80 && <span className="text-orange-400 font-medium">¡Casi agotado!</span>}
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${soldPct >= 80 ? 'bg-orange-500' : 'bg-brand-500'}`}
              style={{ width: `${soldPct}%` }}
            />
          </div>
        </div>
      )}

      {selected && !pkg.is_sold_out && (
        <div className="mt-4 text-center">
          <span className="text-brand-400 text-sm font-semibold">✓ Seleccionado</span>
        </div>
      )}
    </button>
  )
}

interface PageProps {
  params: { 'venue-slug': string; 'event-slug': string }
}

export default function EventPage({ params }: PageProps) {
  const venueSlug = params['venue-slug']
  const eventSlug = params['event-slug']
  const router = useRouter()
  const [selectedPkg, setSelectedPkg] = useState<VipPackage | null>(null)

  // Venue + eventos en un solo query (mismo cache que la página del venue)
  const { data: venueData, isLoading: loadingVenue } = useQuery<PublicVenueDetail>({
    queryKey: ['public-venue', venueSlug],
    queryFn: async () => {
      const r = await publicApi.getVenueBySlug(venueSlug)
      return r.data as PublicVenueDetail
    },
    retry: false,
  })

  const event = venueData?.events?.find(e => e.slug === eventSlug)

  const { data: packages, isLoading: loadingPkgs } = useQuery<VipPackage[]>({
    queryKey: ['public-packages', event?.id],
    queryFn: async () => {
      const r = await publicApi.getPackages(event!.id)
      return r.data
    },
    enabled: !!event?.id,
  })

  const isLoading = loadingVenue || loadingPkgs

  function goCheckout() {
    if (!selectedPkg || !event) return
    router.push(`/${venueSlug}/${eventSlug}/checkout?pkg=${selectedPkg.id}&event=${event.id}&venue=${venueData?.id}`)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 pb-32">
      <Link href={`/${venueSlug}`} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Volver a eventos
      </Link>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-10 w-72 bg-gray-800 rounded-xl animate-pulse" />
          <div className="h-6 w-48 bg-gray-800 rounded animate-pulse" />
        </div>
      ) : event ? (
        <>
          <div className="mb-10">
            {event.artist_name && (
              <p className="text-brand-400 font-semibold text-sm uppercase tracking-wider mb-2">{event.artist_name}</p>
            )}
            <h1 className="text-4xl font-black text-white mb-4">{event.name}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-brand-500" />
                <span className="capitalize">{fmtDate(event.event_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-500" />
                <span>{event.event_start_time.slice(0, 5)}</span>
              </div>
              {event.venue_location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand-500" />
                  <span>{event.venue_location}</span>
                </div>
              )}
            </div>
            {event.description && (
              <p className="mt-4 text-gray-400 leading-relaxed">{event.description}</p>
            )}
          </div>

          <h2 className="text-xl font-bold text-white mb-4">Elige tu package VIP</h2>
          {packages && packages.length > 0 ? (
            <div className="space-y-4">
              {[...packages].sort((a, b) => a.tier_level - b.tier_level).map(pkg => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  selected={selectedPkg?.id === pkg.id}
                  onSelect={() => setSelectedPkg(pkg.id === selectedPkg?.id ? null : pkg)}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">No hay packages disponibles para este evento.</p>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-500">Evento no encontrado.</p>
          <Link href={`/${venueSlug}`} className="text-brand-400 text-sm mt-2 inline-block">Volver</Link>
        </div>
      )}

      {selectedPkg && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950/95 backdrop-blur border-t border-gray-800 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400">{selectedPkg.name}</p>
              <p className="text-xl font-black text-brand-400">{fmt(selectedPkg.price)}</p>
            </div>
            <button
              onClick={goCheckout}
              className="bg-brand-600 hover:bg-brand-500 text-white font-bold px-8 py-3 rounded-xl transition-colors"
            >
              Comprar ahora →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
