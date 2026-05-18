'use client'
import { useState, useEffect, useRef, FormEvent } from 'react'
import { CheckCircle2, XCircle, ScanLine, LogIn, LogOut, Clock, AlertCircle } from 'lucide-react'
import type { CheckInResponse } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function doCheckIn(token: string, code: string, location?: string): Promise<CheckInResponse> {
  const res = await fetch(`${API_BASE}/api/v1/tickets/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ticket_code: code, check_in_location: location || undefined }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al validar el ticket')
  }
  return res.json()
}

async function doLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error('Credenciales incorrectas')
  return res.json()
}

interface ScanHistory {
  id: number
  code: string
  result: CheckInResponse
  ts: Date
}

// ── Login screen ───────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (token: string, name: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const data = await doLogin(email, password)
      onLogin(data.access_token, data.user.full_name)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-700 border border-brand-500 mb-4">
            <ScanLine className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">VIP Check-in</h1>
          <p className="text-gray-400 text-sm mt-1">Ingresa para empezar a escanear</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="staff@venue.com"
              autoComplete="email"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
            />
          </div>

          {err && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-xl px-4 py-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><LogIn className="h-5 w-5" /> Entrar</>
            }
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Camera QR Scanner ─────────────────────────────────────────
function CameraScanner({ onScan }: { onScan: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [active, setActive] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)

  async function startCamera() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setActive(true)
      startScanLoop()
    } catch {
      setError('No se pudo acceder a la cámara. Verifica los permisos.')
    }
  }

  function stopCamera() {
    scanningRef.current = false
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setActive(false)
  }

  function startScanLoop() {
    scanningRef.current = true
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    async function scan() {
      if (!scanningRef.current || !videoRef.current) return
      const video = videoRef.current
      if (video.readyState < 2) { requestAnimationFrame(scan); return }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)

      // Use BarcodeDetector if available (Chrome/Android)
      if ('BarcodeDetector' in window) {
        try {
          const detector = new (window as unknown as { BarcodeDetector: new (opts: object) => { detect: (img: HTMLCanvasElement) => Promise<Array<{rawValue: string}>> } }).BarcodeDetector({ formats: ['qr_code'] })
          const barcodes = await detector.detect(canvas)
          if (barcodes.length > 0) {
            onScan(barcodes[0].rawValue)
            return
          }
        } catch { /* ignore */ }
      }

      requestAnimationFrame(scan)
    }

    requestAnimationFrame(scan)
  }

  useEffect(() => {
    return () => { stopCamera() }
  }, [])

  if (error) {
    return (
      <div className="rounded-2xl border border-red-800 bg-red-900/30 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-300 text-sm">{error}</p>
        <button onClick={startCamera} className="mt-3 text-xs text-red-400 hover:text-red-300 underline">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className={`relative rounded-2xl overflow-hidden bg-gray-900 border-2 transition-colors ${active ? 'border-brand-500' : 'border-gray-700'}`} style={{ aspectRatio: '4/3' }}>
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        {active && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-brand-400 rounded-lg" />
          </div>
        )}
        {!active && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={startCamera}
              className="bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-colors"
            >
              <ScanLine className="h-5 w-5" /> Activar cámara
            </button>
          </div>
        )}
      </div>
      {active && (
        <button onClick={stopCamera} className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-2">
          Detener cámara
        </button>
      )}
    </div>
  )
}

// ── Main app ──────────────────────────────────────────────────
export default function CheckinPage() {
  const [token, setToken] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [mode, setMode] = useState<'camera' | 'manual'>('camera')
  const [manualCode, setManualCode] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [last, setLast] = useState<CheckInResponse | null>(null)
  const [history, setHistory] = useState<ScanHistory[]>([])
  const manualRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Restore session from sessionStorage
    const t = sessionStorage.getItem('checkin_token')
    const n = sessionStorage.getItem('checkin_name')
    if (t && n) { setToken(t); setUserName(n) }
  }, [])

  function handleLogin(t: string, name: string) {
    sessionStorage.setItem('checkin_token', t)
    sessionStorage.setItem('checkin_name', name)
    setToken(t)
    setUserName(name)
  }

  function handleLogout() {
    sessionStorage.removeItem('checkin_token')
    sessionStorage.removeItem('checkin_name')
    setToken(null)
    setUserName('')
    setLast(null)
    setHistory([])
  }

  async function processCode(code: string) {
    if (!token || !code.trim() || loading) return
    setLoading(true)
    setLast(null)
    try {
      const result = await doCheckIn(token, code.trim(), location.trim() || undefined)
      setLast(result)
      setHistory(h => [{ id: Date.now(), code: code.trim(), result, ts: new Date() }, ...h.slice(0, 29)])
      setManualCode('')
    } catch (e) {
      const result: CheckInResponse = {
        success: false,
        message: e instanceof Error ? e.message : 'Error al validar',
        ticket_code: code,
        holder_name: null,
        checked_in_at: null,
      }
      setLast(result)
      setHistory(h => [{ id: Date.now(), code: code.trim(), result, ts: new Date() }, ...h.slice(0, 29)])
      setManualCode('')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return <LoginScreen onLogin={handleLogin} />

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-brand-400" />
          <div>
            <p className="font-bold text-white text-sm">VIP Check-in</p>
            <p className="text-xs text-gray-500">{userName}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          <LogOut className="h-4 w-4" /> Salir
        </button>
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Ubicación de check-in</label>
        <input
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Puerta VIP, Zona Platinum..."
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
        />
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {(['camera', 'manual'] as const).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); if (m === 'manual') setTimeout(() => manualRef.current?.focus(), 100) }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === m ? 'bg-brand-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {m === 'camera' ? '📷 Cámara' : '⌨️ Manual / Lector'}
          </button>
        ))}
      </div>

      {/* Scanner */}
      {mode === 'camera' ? (
        <CameraScanner onScan={processCode} />
      ) : (
        <form
          onSubmit={e => { e.preventDefault(); processCode(manualCode) }}
          className="space-y-3"
        >
          <input
            ref={manualRef}
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            placeholder="TKT-XXXXXXXX"
            autoComplete="off"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-600 font-mono text-lg focus:outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            disabled={loading || !manualCode.trim()}
            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><ScanLine className="h-5 w-5" /> Validar</>
            }
          </button>
        </form>
      )}

      {/* Result */}
      {last && (
        <div className={`rounded-2xl border-2 p-5 flex items-start gap-4 ${
          last.success ? 'bg-green-950 border-green-500' : 'bg-red-950 border-red-500'
        }`}>
          {last.success
            ? <CheckCircle2 className="h-10 w-10 text-green-400 shrink-0" />
            : <XCircle className="h-10 w-10 text-red-400 shrink-0" />
          }
          <div>
            <p className={`text-xl font-black ${last.success ? 'text-green-300' : 'text-red-300'}`}>
              {last.success ? '✓ ACCESO PERMITIDO' : '✗ ACCESO DENEGADO'}
            </p>
            <p className="text-sm mt-1 text-gray-300">{last.message}</p>
            {last.holder_name && <p className="text-base font-bold text-white mt-1">{last.holder_name}</p>}
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

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Historial — {history.length} escaneo{history.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="divide-y divide-gray-800 max-h-64 overflow-y-auto">
            {history.map(h => (
              <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                {h.result.success
                  ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  : <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-white truncate">{h.code}</p>
                  {h.result.holder_name && <p className="text-xs text-gray-500 truncate">{h.result.holder_name}</p>}
                  {!h.result.success && <p className="text-xs text-red-500 truncate">{h.result.message}</p>}
                </div>
                <p className="text-xs text-gray-600 shrink-0">{format(h.ts, 'HH:mm:ss')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
