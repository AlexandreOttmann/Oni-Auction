import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'

/**
 * Runs once on app mount. Calls GET /api/auth/me — the browser automatically
 * sends the HttpOnly `oni_token` cookie. On success, hydrates the auth store.
 * On 401 (no cookie / expired), silently clears the user.
 */
export function useBootstrapAuth() {
  const { setUser, setBootstrapping } = useAuthStore()

  useEffect(() => {
    let cancelled = false

    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return // 401 — not logged in, leave user: null
        const data = await res.json()
        if (!cancelled) {
          setUser({ id: data.user_id, name: data.name, email: data.email, role: data.role })
        }
      })
      .catch(() => {
        // Network error — treat as logged out, app will render normally
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false)
      })

    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
