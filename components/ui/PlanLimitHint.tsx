import Link from 'next/link'
import { ArrowUpCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

// Los rechazos por límite de plan del backend empiezan así
// (event_service y order_service): detectarlos para ofrecer el upgrade.
export function isPlanLimitError(msg: string) {
  return /^(El plan|Límite mensual del plan)\b/.test(msg)
}

/**
 * Botón "Mejorar mi plan" que acompaña a un error de límite de plan.
 * Solo lo ve el venue_owner (es quien puede pedir el cambio en "Mi venue");
 * el super_admin nunca es bloqueado por plan.
 */
export function PlanLimitHint({ message }: { message: string }) {
  const { user } = useAuth()
  if (!isPlanLimitError(message) || user?.role !== 'venue_owner') return null
  return (
    <Link
      href="/admin/mi-venue#plan"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline"
    >
      <ArrowUpCircle className="h-4 w-4" /> Mejorar mi plan
    </Link>
  )
}
