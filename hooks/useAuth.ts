'use client'
import { useState, useEffect, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { saveTokens, clearAuth, getStoredUser, isAuthenticated } from '@/lib/auth'
import type { User, LoginResponse } from '@/lib/types'

interface AuthCtx {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

import React from 'react'

export const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated()) {
      setUser(getStoredUser())
    }
    setLoading(false)
  }, [])

  async function login(email: string, password: string) {
    const { data } = await authApi.login(email, password)
    const res = data as LoginResponse
    saveTokens(res.access_token, res.refresh_token, res.user)
    setUser(res.user)
    router.push('/dashboard')
  }

  function logout() {
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
