/**
 * Auth helper — logs in with email/password, returns the oni_token cookie value.
 * Use in k6 setup() functions to obtain session cookies before tests run.
 */
import http from 'k6/http'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000'

/**
 * Log in and return the raw oni_token cookie string for use in Cookie headers.
 * k6 does not share cookies across VUs, so each VU must carry the cookie explicitly.
 */
export function loginAndGetCookie(email, password) {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } },
  )

  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${res.body}`)
  }

  // Extract the Set-Cookie header for oni_token
  const setCookie = res.headers['Set-Cookie'] || ''
  const match = setCookie.match(/oni_token=([^;]+)/)
  if (!match) {
    throw new Error(`oni_token cookie not found in login response for ${email}`)
  }

  return match[1]
}

/**
 * Build a headers object carrying the oni_token cookie.
 */
export function cookieHeaders(token, extra = {}) {
  return {
    'Content-Type': 'application/json',
    Cookie: `oni_token=${token}`,
    ...extra,
  }
}
