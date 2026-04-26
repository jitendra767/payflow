import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  _id: string
  name: string
  phone: string
  email: string
  upiId: string
  balance: number
}

interface AuthStore {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  updateBalance: (balance: number) => void
  updateUser: (user: Partial<User>) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      setAuth: (user, token) => set({ user, token }),

      updateBalance: (balance) =>
        set((state) => ({
          user: state.user ? { ...state.user, balance } : null,
        })),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'payflow-auth',
    }
  )
)
