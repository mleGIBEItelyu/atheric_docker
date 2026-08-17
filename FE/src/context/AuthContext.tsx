import React, { createContext, useContext, useState, useEffect } from 'react'
import { loginApi, registerApi, getMeApi, verifyCodeApi, resendCodeApi } from '@/services/api'

export interface User {
  id: number
  username: string
  email: string
  role: 'USER' | 'ADMIN'
  isVerified?: boolean
  isActive?: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isAdmin: boolean
  isLoginModalOpen: boolean
  setIsLoginModalOpen: (open: boolean) => void
  login: (username: string, pass: string) => Promise<{ success: boolean; error?: string }>
  register: (username: string, email: string, pass: string) => Promise<{ success: boolean; error?: string; needsVerification?: boolean; email?: string; devCode?: string }>
  verifyCode: (email: string, code: string) => Promise<{ success: boolean; error?: string }>
  resendCode: (email: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('atheric_token'))
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false)

  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem('atheric_token')
      const storedUser = localStorage.getItem('atheric_user')
      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser))
          setToken(storedToken)
          const currentUser = await getMeApi(storedToken)
          if (currentUser && currentUser.id) {
            setUser(currentUser)
            localStorage.setItem('atheric_user', JSON.stringify(currentUser))
          } else {
            localStorage.removeItem('atheric_token')
            localStorage.removeItem('atheric_user')
            setUser(null)
            setToken(null)
          }
        } catch {
          localStorage.removeItem('atheric_token')
          localStorage.removeItem('atheric_user')
          setUser(null)
          setToken(null)
        }
      }
      setIsLoading(false)
    }
    initAuth()
  }, [])

  async function login(username: string, pass: string) {
    try {
      const res = await loginApi(username, pass)
      if (res.token && res.user) {
        setToken(res.token)
        setUser(res.user)
        localStorage.setItem('atheric_token', res.token)
        localStorage.setItem('atheric_user', JSON.stringify(res.user))
        return { success: true }
      }
      return { success: false, error: res.error || 'Login gagal. Periksa username & password.' }
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal terhubung ke backend.' }
    }
  }

  async function register(username: string, email: string, pass: string) {
    try {
      const res = await registerApi(username, email, pass)
      // New flow: register returns email + devCode, verification needed
      if (res.email) {
        return { success: true, needsVerification: true, email: res.email, devCode: res.devCode }
      }
      // Legacy: direct token flow (shouldn't happen now)
      if (res.token && res.user) {
        setToken(res.token)
        setUser(res.user)
        localStorage.setItem('atheric_token', res.token)
        localStorage.setItem('atheric_user', JSON.stringify(res.user))
        return { success: true }
      }
      return { success: false, error: res.error || 'Registrasi gagal.' }
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal terhubung ke backend.' }
    }
  }

  async function verifyCode(email: string, code: string) {
    try {
      const res = await verifyCodeApi(email, code)
      if (res.token && res.user) {
        setToken(res.token)
        setUser(res.user)
        localStorage.setItem('atheric_token', res.token)
        localStorage.setItem('atheric_user', JSON.stringify(res.user))
        return { success: true }
      }
      return { success: false, error: res.error || 'Verifikasi gagal.' }
    } catch (err: any) {
      return { success: false, error: err.message || 'Kode verifikasi salah atau kadaluarsa.' }
    }
  }

  async function resendCode(email: string) {
    try {
      await resendCodeApi(email)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal mengirim ulang kode.' }
    }
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem('atheric_token')
    localStorage.removeItem('atheric_user')
  }

  const isAdmin = user?.role === 'ADMIN'

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        isAdmin,
        isLoginModalOpen,
        setIsLoginModalOpen,
        login,
        register,
        verifyCode,
        resendCode,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
