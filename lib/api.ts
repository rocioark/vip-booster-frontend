import axios, { AxiosError } from 'axios'
import { clearAuth } from './auth'

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean }
    const isAuthEndpoint = original?.url?.includes('/auth/')
    if (error.response?.status === 401 && !original?._retry && !isAuthEndpoint) {
      original._retry = true
      try {
        await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true })
        return api(original)
      } catch {
        clearAuth()
        if (typeof window !== 'undefined') window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
}

// ── Analytics ────────────────────────────────────────────────
export const analyticsApi = {
  summary: (venueId?: string) =>
    api.get('/analytics/summary', { params: venueId ? { venue_id: venueId } : {} }),
  event: (eventId: string) =>
    api.get(`/analytics/events/${eventId}`),
}

// ── Venues ───────────────────────────────────────────────────
export const venuesApi = {
  list: (params?: { skip?: number; limit?: number }) =>
    api.get('/venues', { params: { limit: 100, ...params } }),
  get: (id: string) => api.get(`/venues/${id}`),
  create: (data: unknown) => api.post('/venues', data),
  update: (id: string, data: unknown) => api.patch(`/venues/${id}`, data),
}

// ── Events ───────────────────────────────────────────────────
export const eventsApi = {
  list: (params?: { venue_id?: string; skip?: number; limit?: number }) =>
    api.get('/events', { params }),
  get: (id: string) => api.get(`/events/${id}`),
  create: (data: unknown) => api.post('/events', data),
  update: (id: string, data: unknown) => api.patch(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
}

// ── VIP Packages ─────────────────────────────────────────────
export const vipPackagesApi = {
  list: (eventId: string) =>
    api.get('/vip-packages', { params: { event_id: eventId } }),
  create: (data: unknown) => api.post('/vip-packages', data),
  update: (id: string, data: unknown) => api.patch(`/vip-packages/${id}`, data),
  delete: (id: string) => api.delete(`/vip-packages/${id}`),
}

// ── Customers ────────────────────────────────────────────────
export const customersApi = {
  list: (params?: { venue_id?: string; email?: string; search?: string; skip?: number; limit?: number }) =>
    api.get('/customers', { params: { limit: 100, ...params } }),
  create: (data: unknown) => api.post('/customers', data),
  get: (id: string) => api.get(`/customers/${id}`),
}

// ── Orders ───────────────────────────────────────────────────
export const ordersApi = {
  list: (params?: { event_id?: string; skip?: number; limit?: number }) =>
    api.get('/orders', { params }),
  get: (id: string) => api.get(`/orders/${id}`),
  create: (data: unknown) => api.post('/orders', data),
  tickets: (orderId: string) => api.get(`/orders/${orderId}/tickets`),
  confirmPayment: (id: string, gateway_transaction_id: string = 'MANUAL') =>
    api.post(`/orders/${id}/confirm-payment`, { gateway_transaction_id }),
  cancel: (id: string, reason: string, refund_amount?: number) =>
    api.post(`/orders/${id}/cancel`, { reason, refund_amount }),
}

// ── Tickets ──────────────────────────────────────────────────
export const ticketsApi = {
  checkIn: (ticket_code: string, check_in_location?: string) =>
    api.post('/tickets/check-in', { ticket_code, check_in_location }),
  pdfUrl: (ticketId: string) =>
    `/api/v1/tickets/${ticketId}/pdf`,
}

// ── Discounts ────────────────────────────────────────────────
// DELETE /{code} deactivates (soft delete). No update/activate endpoint exists.
export const discountsApi = {
  list: (params?: { venue_id?: string; active_only?: boolean; skip?: number; limit?: number }) =>
    api.get('/discounts', { params }),
  create: (data: unknown) => api.post('/discounts', data),
  deactivate: (code: string) => api.delete(`/discounts/${code}`),
  validate: (code: string, venue_id: string, subtotal: number) =>
    api.get('/discounts/validate', { params: { code, venue_id, subtotal } }),
}

