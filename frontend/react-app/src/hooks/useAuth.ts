import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  const navigate = useNavigate()
  const { user, isLoading, error, setUser, setError, setLoading, logout: storeLogout } = useAuthStore()

  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const detail = data.detail
        throw new Error(
          typeof detail === 'string' ? detail : 'Invalid email or password.',
        )
      }
      const data = await res.json()
      setUser({ id: data.user_id, name: data.name, email, role: data.role })
      navigate(data.role === 'ADMIN' ? '/dashboard' : '/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    storeLogout()
    navigate('/')
  }

  return { user, isLoading, error, login, logout, setError }
}
