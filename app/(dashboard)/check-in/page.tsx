'use client'
import { useState, FormEvent, useRef, useEffect } from 'react'
import { ticketsApi } from '@/lib/api'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { CheckInResponse } from '@/lib/types'
import { CheckCircle2, XCircle, ScanLine, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface HistoryEntry {
  id: number
  code: string
  result: CheckInResponse
  ts: Date
}

export default function CheckInPage() {
  const [code, setCode] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [last, setLast] = useState<CheckInResponse | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [last])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setLast(null)
    try {
      const res = await ticketsApi.checkIn(code.trim(), location.trim() || undefined)
      const result = res.data as CheckInResponse
      setLast(result)
      setHistory((h) => [{ id: Date.now(), code: code.trim(), result, ts: new Date() }, ...h.slice(0, 19)])
      setCode('')
    } catch {
      const err: CheckInResponse = {
        success: false,
        message: 'Error de red o ticket no encontrado',
        ticket_code: code,
        holder_name: null,
        checked_in_at: null,
      }
      setLast(err)
      setHistory((h) => [{ id: Date.now(), code: code.trim(), result: err, ts: new Date() }, ...h.slice(0, 19)])
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Header title="Check-in de Tickets" />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Scanner */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Escanear ticket" />
            <CardBody className="space-y-4">
              <p className="text-sm text-gray-500">
                Ingresa o escanea el código del ticket con un lector QR conectado.
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  ref={inputRef}
                  id="ticket-code"
                  label="Código del ticket"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="TKT-ABC1234567"
                  className="font-mono"
                  autoComplete="off"
                />
                <Input
                  id="location"
                  label="Ubicación (opcional)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Puerta VIP Norte"
                />
                <Button type="submit" className="w-full" loading={loading}>
                  <ScanLine className="h-4 w-4" />
                  Validar ticket
                </Button>
              </form>
            </CardBody>
          </Card>

          {/* Result */}
          {last && (
            <div className={`rounded-xl border-2 p-5 flex items-start gap-4 ${
              last.success
                ? 'bg-green-50 border-green-400'
                : 'bg-red-50 border-red-400'
            }`}>
              {last.success
                ? <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0 mt-0.5" />
                : <XCircle className="h-8 w-8 text-red-600 shrink-0 mt-0.5" />
              }
              <div>
                <p className={`font-bold text-lg ${last.success ? 'text-green-800' : 'text-red-800'}`}>
                  {last.success ? 'Acceso permitido' : 'Acceso denegado'}
                </p>
                <p className="text-sm mt-1 text-gray-700">{last.message}</p>
                {last.holder_name && (
                  <p className="text-sm font-medium text-gray-900 mt-1">{last.holder_name}</p>
                )}
                <p className="text-xs text-gray-500 font-mono mt-1">{last.ticket_code}</p>
                {last.checked_in_at && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(last.checked_in_at), "HH:mm:ss · d MMM", { locale: es })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* History */}
        <Card>
          <CardHeader title={`Historial (${history.length})`} />
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {history.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-gray-400">
                Aún no hay escaneos en esta sesión
              </div>
            )}
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                {h.result.success
                  ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  : <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono font-medium text-gray-900 truncate">{h.code}</p>
                  {h.result.holder_name && (
                    <p className="text-xs text-gray-500 truncate">{h.result.holder_name}</p>
                  )}
                  {!h.result.success && (
                    <p className="text-xs text-red-600 truncate">{h.result.message}</p>
                  )}
                </div>
                <p className="text-xs text-gray-400 shrink-0">
                  {format(h.ts, 'HH:mm:ss')}
                </p>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </div>
  )
}
