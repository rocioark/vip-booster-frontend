'use client'
import { useState, FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi, vipPackagesApi, customersApi, ordersApi } from '@/lib/api'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Event, VipPackage, Customer } from '@/lib/types'
import { Plus, Minus, Search } from 'lucide-react'
import { AxiosError } from 'axios'

interface OrderItem { vip_package_id: string; quantity: number; name: string; price: number }

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'pse', label: 'PSE' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'transfer', label: 'Transferencia' },
]

const SALES_CHANNELS = [
  { value: 'pos', label: 'POS' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'online', label: 'Online' },
]

interface Props { open: boolean; onClose: () => void; venueId: string }

export function CreateOrderModal({ open, onClose, venueId }: Props) {
  const qc = useQueryClient()

  // Step state
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedEventId, setSelectedEventId] = useState('')
  const [items, setItems] = useState<OrderItem[]>([])
  const [customerEmail, setCustomerEmail] = useState('')
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [holderName, setHolderName] = useState('')
  const [holderEmail, setHolderEmail] = useState('')
  const [holderPhone, setHolderPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [salesChannel, setSalesChannel] = useState('pos')
  const [discountCode, setDiscountCode] = useState('')
  const [err, setErr] = useState('')
  const [searching, setSearching] = useState(false)

  function reset() {
    setStep(1); setSelectedEventId(''); setItems([])
    setCustomerEmail(''); setFoundCustomer(null)
    setNewCustomerName(''); setNewCustomerPhone('')
    setHolderName(''); setHolderEmail(''); setHolderPhone('')
    setPaymentMethod('cash'); setSalesChannel('pos'); setDiscountCode(''); setErr('')
  }

  const { data: events } = useQuery<Event[]>({
    queryKey: ['events', venueId],
    queryFn: async () => { const r = await eventsApi.list({ venue_id: venueId }); return r.data },
    enabled: open,
  })

  const { data: packages } = useQuery<VipPackage[]>({
    queryKey: ['vip-packages', selectedEventId],
    queryFn: async () => { const r = await vipPackagesApi.list(selectedEventId); return r.data },
    enabled: !!selectedEventId,
  })

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['customers', venueId],
    queryFn: async () => { const r = await customersApi.list(); return r.data },
    enabled: open,
  })

  function searchCustomer() {
    if (!customerEmail.trim()) return
    setSearching(true)
    const found = customers?.find(c => c.email.toLowerCase() === customerEmail.trim().toLowerCase()) ?? null
    setFoundCustomer(found)
    if (found) { setHolderName(found.full_name); setHolderEmail(found.email); setHolderPhone(found.phone ?? '') }
    setSearching(false)
  }

  function adjustItem(pkgId: string, pkgName: string, pkgPrice: number, delta: number) {
    setItems(prev => {
      const existing = prev.find(i => i.vip_package_id === pkgId)
      if (!existing) {
        return delta > 0 ? [...prev, { vip_package_id: pkgId, quantity: 1, name: pkgName, price: pkgPrice }] : prev
      }
      const newQty = existing.quantity + delta
      if (newQty <= 0) return prev.filter(i => i.vip_package_id !== pkgId)
      return prev.map(i => i.vip_package_id === pkgId ? { ...i, quantity: newQty } : i)
    })
  }

  const createOrderMut = useMutation({
    mutationFn: async () => {
      let customerId: string

      if (foundCustomer) {
        customerId = foundCustomer.id
      } else {
        // Create customer first
        const { data: newCust } = await customersApi.create({
          venue_id: venueId,
          email: customerEmail.trim(),
          full_name: newCustomerName.trim(),
          phone: newCustomerPhone.trim() || null,
        })
        customerId = newCust.id
      }

      return ordersApi.create({
        venue_id: venueId,
        event_id: selectedEventId,
        customer_id: customerId,
        items: items.map(i => ({ vip_package_id: i.vip_package_id, quantity: i.quantity })),
        payment_method: paymentMethod,
        sales_channel: salesChannel,
        holder_name: holderName || null,
        holder_email: holderEmail || null,
        holder_phone: holderPhone || null,
        discount_code: discountCode || null,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      onClose()
      reset()
    },
    onError: (e: AxiosError<{ detail: string }>) => setErr(e.response?.data?.detail ?? 'Error al crear la orden'),
  })

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const platformFee = subtotal * 0.05
  const gatewayFee = ['cash', 'transfer'].includes(paymentMethod) ? 0 : subtotal * 0.025
  const total = subtotal + platformFee + gatewayFee

  function handleNext(e: FormEvent) {
    e.preventDefault()
    if (!selectedEventId) { setErr('Selecciona un evento'); return }
    if (items.length === 0) { setErr('Agrega al menos un package'); return }
    setErr('')
    setStep(2)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!customerEmail.trim()) { setErr('Email del cliente es requerido'); return }
    if (!foundCustomer && !newCustomerName.trim()) { setErr('Nombre del cliente es requerido para crear nuevo cliente'); return }
    createOrderMut.mutate()
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }} title="Nueva orden POS" size="lg">
      {step === 1 ? (
        <form onSubmit={handleNext} className="space-y-5">
          {/* Event selector */}
          <div>
            <label className="text-sm font-medium text-gray-700">Evento *</label>
            <select
              value={selectedEventId}
              onChange={e => { setSelectedEventId(e.target.value); setItems([]) }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Seleccionar evento...</option>
              {events?.filter(e => e.status === 'published' || e.status === 'sold_out').map(e => (
                <option key={e.id} value={e.id}>{e.name} — {e.event_date}</option>
              ))}
            </select>
          </div>

          {/* Packages */}
          {selectedEventId && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Packages VIP</p>
              {packages?.length === 0 && <p className="text-sm text-gray-500">Este evento no tiene packages.</p>}
              <div className="space-y-2">
                {packages?.map(pkg => {
                  const item = items.find(i => i.vip_package_id === pkg.id)
                  return (
                    <div key={pkg.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${pkg.is_sold_out ? 'opacity-50 bg-gray-50' : 'bg-white'}`}>
                      <div>
                        <p className="text-sm font-medium">{pkg.name}</p>
                        <p className="text-xs text-gray-500">{fmt(Number(pkg.price))} · {pkg.quantity_available} disponibles</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {item && (
                          <>
                            <button type="button" onClick={() => adjustItem(pkg.id, pkg.name, Number(pkg.price), -1)} className="h-7 w-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          </>
                        )}
                        <button
                          type="button"
                          disabled={pkg.is_sold_out}
                          onClick={() => adjustItem(pkg.id, pkg.name, Number(pkg.price), 1)}
                          className="h-7 w-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Summary */}
          {items.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm">
              {items.map(i => (
                <div key={i.vip_package_id} className="flex justify-between text-gray-700">
                  <span>{i.name} × {i.quantity}</span>
                  <span>{fmt(i.price * i.quantity)}</span>
                </div>
              ))}
            </div>
          )}

          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={items.length === 0}>Siguiente →</Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Customer search */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Cliente</p>
            <div className="flex gap-2">
              <Input
                id="cust-email"
                label=""
                type="email"
                value={customerEmail}
                onChange={e => { setCustomerEmail(e.target.value); setFoundCustomer(null) }}
                placeholder="email@cliente.com"
                className="flex-1"
              />
              <button
                type="button"
                onClick={searchCustomer}
                disabled={searching}
                className="mt-0 flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
              >
                <Search className="h-4 w-4" /> Buscar
              </button>
            </div>
            {customerEmail && foundCustomer && (
              <div className="mt-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm">
                <p className="text-green-800 font-medium">Cliente encontrado: {foundCustomer.full_name}</p>
              </div>
            )}
            {customerEmail && foundCustomer === null && customers !== undefined && (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">Cliente no encontrado — se creará uno nuevo</p>
                <Input id="new-name" label="Nombre completo *" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} />
                <Input id="new-phone" label="Teléfono" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} placeholder="+57 310 000 0000" />
              </div>
            )}
          </div>

          {/* Holder info */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Portador de los tickets</p>
            <div className="grid grid-cols-2 gap-3">
              <Input id="h-name" label="Nombre" value={holderName} onChange={e => setHolderName(e.target.value)} />
              <Input id="h-email" label="Email" type="email" value={holderEmail} onChange={e => setHolderEmail(e.target.value)} />
              <Input id="h-phone" label="Teléfono" value={holderPhone} onChange={e => setHolderPhone(e.target.value)} className="col-span-2" />
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Método de pago</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Canal</label>
              <select value={salesChannel} onChange={e => setSalesChannel(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {SALES_CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <Input id="discount" label="Código de descuento (opcional)" value={discountCode} onChange={e => setDiscountCode(e.target.value)} placeholder="PROMO20" />

          {/* Total summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="flex justify-between text-gray-600"><span>Platform fee (5%)</span><span>{fmt(platformFee)}</span></div>
            {gatewayFee > 0 && <div className="flex justify-between text-gray-600"><span>Gateway fee (2.5%)</span><span>{fmt(gatewayFee)}</span></div>}
            <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span>{fmt(total)}</span></div>
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex justify-between pt-2">
            <Button type="button" variant="secondary" onClick={() => { setStep(1); setErr('') }}>← Volver</Button>
            <Button type="submit" loading={createOrderMut.isPending}>Crear orden</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
