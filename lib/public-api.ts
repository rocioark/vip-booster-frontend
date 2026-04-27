import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const pub = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

export const publicApi = {
  // Venue + eventos publicados en una sola llamada
  getVenueBySlug: (slug: string) =>
    pub.get(`/public/venues/${slug}`),

  // Packages VIP de un evento
  getPackages: (eventId: string) =>
    pub.get('/public/vip-packages', { params: { event_id: eventId } }),

  // Clientes (get_or_create por email+venue)
  createCustomer: (data: unknown) =>
    pub.post('/public/customers', data),

  // Órdenes
  createOrder: (data: unknown) =>
    pub.post('/public/orders', data),

  getOrder: (orderId: string) =>
    pub.get(`/public/orders/${orderId}`),

  getOrderTickets: (orderId: string) =>
    pub.get(`/public/orders/${orderId}/tickets`),

  // Descuentos
  validateDiscount: (code: string, venueId: string, subtotal: number) =>
    pub.get('/public/discounts/validate', { params: { code, venue_id: venueId, subtotal } }),
}
