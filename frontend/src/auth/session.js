// Holds the login session (JWT + user) in localStorage.
// Where the token should live (localStorage vs httpOnly cookie) is a decision to confirm with Sarthak;
// only this file and api/http.js would change.
const KEY = 'pm.session'

export function loadSession() {
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}
export function saveSession(session) {
  try { localStorage.setItem(KEY, JSON.stringify(session)) } catch { /* storage blocked */ }
}
export function clearSession() {
  try { localStorage.removeItem(KEY) } catch { /* storage blocked */ }
}
export const getToken = () => loadSession()?.token || null

// Reads the payload of a JWT without verifying it. The server is the only real authority;
// this is just so the UI can notice an expired token early and so role/name can be read if present.
export function decodeJwt(token) {
  try {
    const part = String(token).split('.')[1]
    if (!part) return {}
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch { return {} }
}
// "exp" is the standard JWT expiry claim (seconds since epoch).
export function isTokenExpired(token) {
  const { exp } = decodeJwt(token)
  return typeof exp === 'number' && exp * 1000 <= Date.now()
}
