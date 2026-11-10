import { ApiError, request } from './http'

/**
 * ⚠ UNCONFIRMED CONTRACT (same status as login in api/auth.js): the backend has not agreed a register endpoint yet.
 * Everything backend-specific about sign-up lives in this one object. Set VITE_AUTH_REGISTER_PATH in .env to override the path.
 */
const env = import.meta.env
export const REGISTER_CONTRACT = {
  path: (typeof env.VITE_AUTH_REGISTER_PATH === 'string' && env.VITE_AUTH_REGISTER_PATH.trim()) || '/auth/register',
  nameField: 'name',
  emailField: 'email',
  passwordField: 'password',
  collegeField: 'college',   // what the student types (college name or code); the backend resolves it to a tenant
  role: 'student',           // self-registration is student-only; admins are provisioned by the platform
  roleField: 'role',         // set to '' if the backend should not receive a role
}

/** Resolves when the account is created, or throws an ApiError. The caller then logs the person in. */
export async function register({ name, email, password, college }) {
  const c = REGISTER_CONTRACT
  const body = {
    [c.nameField]: name,
    [c.emailField]: email,
    [c.passwordField]: password,
    ...(college ? { [c.collegeField]: college } : {}),
    ...(c.roleField ? { [c.roleField]: c.role } : {}),
  }
  try {
    return await request(c.path, { method: 'POST', json: body })
  } catch (err) {
    if (err instanceof ApiError && err.usedDefault && err.status === 409) {
      throw new ApiError('An account with this email already exists. Log in instead.', { status: 409 })
    }
    if (err instanceof ApiError && err.usedDefault && err.status === 422) {
      throw new ApiError('The server could not accept these details. Check your name, email and password.', { status: 422 })
    }
    throw err
  }
}
