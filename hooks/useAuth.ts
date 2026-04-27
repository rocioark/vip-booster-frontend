'use client'
import { useState, useEffect, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { api, authApi } from '@/lib/api'
import { saveUser, clearAuth } from '@/lib/auth'
import type { User, LoginResponse } from '@/lib/types'

interface AuthCtx {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

import React from 'react'

export const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Validate session via the server — the vb_access cookie is sent automatically
    authApi.me()
      .then(({ data }) => {
        const u = data as User
        setUser(u)
        saveUser(u)
      })
      .catch(() => {
        clearAuth()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const { data } = await authApi.login(email, password)
    const res = data as LoginResponse
    // Tokens are stored in httpOnly cookies by the backend; only persist user metadata
    saveUser(res.user)
    setUser(res.user)
    router.push('/admin/dashboard')
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // Proceed with local cleanup even if the server call fails
    }
    clearAuth()
    setUser(null)
    router.push('/login')
  }

  return React.createElement(
    AuthContext.Provider,
    { value: { user, loading, login, logout } },
    children
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
