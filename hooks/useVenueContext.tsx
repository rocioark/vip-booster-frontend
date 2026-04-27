'use client'
import { createContext, useContext, useState, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { venuesApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import type { Venue } from '@/lib/types'

interface VenueContextType {
  venues: Venue[]
  selectedVenueId: string | null
  effectiveVenueId: string | undefined
  setSelectedVenueId: (id: string) => void
  venuesLoading: boolean
}

const VenueContext = createContext<VenueContextType>({
  venues: [],
  selectedVenueId: null,
  effectiveVenueId: undefined,
  setSelectedVenueId: () => {},
  venuesLoading: false,
})

export function VenueProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)

  const { data: venues = [], isLoading: venuesLoading } = useQuery<Venue[]>({
    queryKey: ['venues-list'],
    queryFn: async () => {
      const res = await venuesApi.list()
      return res.data
    },
    enabled: isSuperAdmin && !!user,
    staleTime: 5 * 60 * 1000,
  })

  const effectiveVenueId: string | undefined = isSuperAdmin
    ? (selectedVenueId ?? venues[0]?.id)
    : (user?.venue_id ?? undefined)

  return (
    <VenueContext.Provider value={{ venues, selectedVenueId, effectiveVenueId, setSelectedVenueId, venuesLoading }}>
      {children}
    </VenueContext.Provider>
  )
}

export function useVenue() {
  return useContext(VenueContext)
}
