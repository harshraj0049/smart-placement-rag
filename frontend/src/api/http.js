import { API_BASE_URL } from '../config'
import { getToken } from '../auth/session'

export class ApiError extends Error {
  constructor(message, { status = 0, code, payload, usedDefault = false } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.payload = payload
    this.usedDefault = usedDefault // true when the server sent no readable message
  }
}

/** Thrown by services whose endpoint path is still empty in the env config. */
export const notConfigured = (what, envVar) =>
  new ApiError(`${what} is not connected yet. Set ${envVar} once the backend path is confirmed.`, { code: 'not_configured' })
export const isNotConfigured = (err) => err?.code === 'not_configured'

// Called when a request that carried a token comes back 401 (expired or invalid token).
let onUnauthorized = null
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

const DEFAULT_MESSAGES = {
  400: 'The server rejected this request.',
  401: 'Your session has expired or you are not logged in.',
  403: 'You do not have permission to do this.',
  404: 'The server could not find this endpoint. Check the API path settings.',
  405: 'The server does not accept this kind of request at this path.',
  413: 'The server says this file is too large.',
  415: 'The server does not accept this file type.',
  422: 'The server could not accept the details you submitted.',
}
const defaultMessage = (status) => DEFAULT_MESSAGES[status] || (status >= 500 ? 'The server ran into a problem. Try again in a moment.' : `Request failed (${status}).`)

/** Pulls a human-readable message out of a FastAPI-style or plain error body. */
export function extractErrorMessage(payload) {
  if (!payload) return null
  if (typeof payload === 'string') {
    const t = payload.trim()
    return t && !t.startsWith('<') && t.length < 300 ? t : null
  }
  const d = payload.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) {
    const parts = d.map((x) => {
      if (typeof x === 'string') return x
      const field = Array.isArray(x?.loc) ? x.loc.filter((p) => p !== 'body').join('.') : ''
      return x?.msg ? (field ? `${field}: ${x.msg}` : x.msg) : null
    }).filter(Boolean)
    if (parts.length) return parts.join(' ')
  }
  if (d && typeof d === 'object' && typeof d.message === 'string') return d.message
  if (typeof payload.message === 'string') return payload.message
  if (typeof payload.error === 'string') return payload.error
  return null
}

async function readBody(res) {
  const type = res.headers.get('content-type') || ''
  try { return type.includes('json') ? await res.json() : await res.text() } catch { return null }
}

const joinUrl = (path) => (/^https?:\/\//i.test(path) ? path : `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`)

/**
 * One fetch wrapper for the whole app.
 *  - adds the Authorization header when a token exists
 *  - json:     sends application/json
 *  - formData: sends multipart; Content-Type is deliberately NOT set, the browser adds the boundary
 *  - form:     sends application/x-www-form-urlencoded (object of fields)
 */
export async function request(path, { method = 'GET', json, formData, form, signal } = {}) {
  const headers = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let body
  if (formData) body = formData
  else if (form) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; body = new URLSearchParams(form) }
  else if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json) }

  let res
  try {
    res = await fetch(joinUrl(path), { method, headers, body, signal })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new ApiError('Cannot reach the server. Check your connection and that the backend is running.', { code: 'network' })
  }

  const payload = await readBody(res)
  if (!res.ok) {
    if (res.status === 401 && token && onUnauthorized) onUnauthorized()
    const msg = extractErrorMessage(payload)
    throw new ApiError(msg || defaultMessage(res.status), { status: res.status, payload, usedDefault: !msg })
  }
  return payload
}
