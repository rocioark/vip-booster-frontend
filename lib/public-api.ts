import axios from 'axios'

const pub = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

export const publicApi = {
  // Venue + eventos publicados en una sola llamada
  getVenueBySlug: (slug: string) =>
    pub.get(`/public/venues/${slug}`),

  // Eventos publicados de todos los venues
  listEvents: (params?: { limit?: number; skip?: number }) =>
    pub.get('/public/events', { params }),

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
  // eventId es opcional en la API, pero sin él un código acotado a un evento
  // se rechaza siempre: mandarlo desde el checkout del evento.
  validateDiscount: (code: string, venueId: string, subtotal: number, eventId?: string) =>
    pub.get('/public/discounts/validate', {
      params: { code, venue_id: venueId, subtotal, event_id: eventId },
    }),
}
