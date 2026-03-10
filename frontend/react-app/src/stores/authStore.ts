import { create } from 'zustand'

export interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'BUYER' | 'SELLER'
}

interface AuthStore {
  user: User | null
  isLoading: boolean
  isBootstrapping: boolean
  error: string | null
  setUser: (user: User) => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  setBootstrapping: (bootstrapping: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  isBootstrapping: true,
  error: null,
  setUser: (user) => set({ user, error: null }),
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),
  setBootstrapping: (isBootstrapping) => set({ isBootstrapping }),
  logout: () => set({ user: null }),
}))
