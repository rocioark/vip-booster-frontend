import axios, { AxiosError } from 'axios'
import { getAccessToken, getRefreshToken, saveTokens, clearAuth, getStoredUser } from './auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean }
    if (error.response?.status === 401 && !original?._retry) {
      original._retry = true
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          })
          const user = getStoredUser()!
          saveTokens(data.access_token, data.refresh_token, user)
          original.headers!.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          clearAuth()
          window.location.href = '/login'
        }
      } else {
        clearAuth()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
}

// ── Analytics ────────────────────────────────────────────────
export const analyticsApi = {
  summary: (venueId?: string) =>
    api.get('/analytics/summary', { params: venueId ? { venue_id: venueId } : {} }),
  event: (eventId: string) =>
    api.get(`/analytics/events/${eventId}`),
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
  list: (params?: { skip?: number; limit?: number }) =>
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
    `${BASE_URL}/api/v1/tickets/${ticketId}/pdf`,
}
