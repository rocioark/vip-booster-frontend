import type { User } from './types'

const USER_KEY = 'vb_user'

// Tokens are stored in httpOnly cookies set by the backend.
// Only user metadata is kept in localStorage for optimistic UI reads.

export function saveUser(user: User) {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function clearAuth() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USER_KEY)
}

// Optimistic check — AuthProvider validates via /auth/me on mount
export function isAuthenticated(): boolean {
  return !!getStoredUser()
}
