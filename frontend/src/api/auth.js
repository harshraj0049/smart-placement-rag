import { ENDPOINTS } from '../config'
import { ApiError, notConfigured, request } from './http'
import { decodeJwt } from '../auth/session'

/**
 * ⚠ UNCONFIRMED CONTRACT: nothing below has been agreed with Sarthak yet.
 * Every backend-specific guess about login lives in this one object, so his answers
 * only need to be copied here (and VITE_AUTH_LOGIN_PATH set in .env).
 */
export const AUTH_CONTRACT = {
  encoding: 'json',          // 'json' or 'form' (FastAPI's OAuth2PasswordRequestForm expects form with a "username" field)
  emailField: 'email',       // use 'username' with the form encoding
  passwordField: 'password',
  tokenField: 'access_token',
  userObjectField: 'user',   // optional object in the response holding name / email / role
  // Maps the backend's role strings to the two roles this app knows.
  roleMap: { admin: 'admin', college_admin: 'admin', student: 'student' },
}

function parseLoginResponse(payload) {
  const c = AUTH_CONTRACT
  const token = payload?.[c.tokenField]
  if (typeof token !== 'string' || !token) {
    throw new ApiError(`The login response did not contain "${c.tokenField}". Check AUTH_CONTRACT in src/api/auth.js.`, { code: 'contract' })
  }
  const claims = decodeJwt(token)
  const u = payload[c.userObjectField] || {}
  const rawRole = u.role ?? payload.role ?? claims.role
  const role = c.roleMap[String(rawRole ?? '').toLowerCase()]
  if (!role) {
    throw new ApiError(`Your account role (${rawRole ?? 'missing'}) is not supported by this app.`, { code: 'contract' })
  }
  const str = (v) => (typeof v === 'string' ? v : '')
  return {
    token,
    user: {
      role,
      name: str(u.name ?? payload.name ?? claims.name),
      email: str(u.email ?? payload.email ?? claims.email),
      collegeName: str(u.college_name ?? u.college) || undefined,
    },
  }
}

/** Resolves to { token, user: { role, name, email, collegeName? } } or throws an ApiError. */
export async function login({ email, password }) {
  if (!ENDPOINTS.login) throw notConfigured('Login', 'VITE_AUTH_LOGIN_PATH')
  const c = AUTH_CONTRACT
  const fields = { [c.emailField]: email, [c.passwordField]: password }
  try {
    const payload = await request(ENDPOINTS.login, { method: 'POST', ...(c.encoding === 'form' ? { form: fields } : { json: fields }) })
    return parseLoginResponse(payload)
  } catch (err) {
    if (err instanceof ApiError && err.usedDefault && (err.status === 400 || err.status === 401)) {
      throw new ApiError('Incorrect email or password.', { status: err.status })
    }
    throw err
  }
}
