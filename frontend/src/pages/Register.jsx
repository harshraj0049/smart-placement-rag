import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { GraduationCap, Loader2, AlertCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { ROLE_HOME } from '../auth/roles'
import { register } from '../api/register'

const MIN_PW = 8

function validate(v) {
  const e = {}
  if (!v.name.trim()) e.name = 'Enter your full name.'
  else if (v.name.trim().length > 100) e.name = 'Name can be at most 100 characters.'
  const mail = v.email.trim()
  if (!mail) e.email = 'Enter your email address.'
  else if (!/^\S+@\S+\.\S+$/.test(mail)) e.email = 'Enter a valid email address, for example you@college.edu.'
  if (!v.college.trim()) e.college = 'Enter your college name.'
  if (!v.pw) e.pw = 'Choose a password.'
  else if (v.pw.length < MIN_PW) e.pw = `Password must be at least ${MIN_PW} characters.`
  if (!v.confirm) e.confirm = 'Re-enter your password.'
  else if (v.confirm !== v.pw) e.confirm = 'Passwords do not match.'
  return e
}

export default function Register() {
  const { user, login } = useApp()
  const nav = useNavigate()
  const [v, setV] = useState({ name: '', email: '', college: '', pw: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => { setV((s) => ({ ...s, [k]: e.target.value })); if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined })) }

  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const found = validate(v)
    setErrors(found)
    if (Object.keys(found).length) return
    setErr(''); setBusy(true)
    const email = v.email.trim()
    try {
      await register({ name: v.name.trim(), email, password: v.pw, college: v.college.trim() })
    } catch (ex) {
      setErr(ex.message || 'Could not create your account. Try again.')
      setBusy(false)
      return
    }
    // Account exists. Log in with the same details; on success `user` is set and the redirect above runs.
    try { await login({ email, password: v.pw }) }
    catch { nav('/login', { replace: true, state: { registered: true } }) }
    finally { setBusy(false) }
  }

  const field = (id, label, type, props = {}) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="input" type={type} value={v[props.key || id]} onChange={set(props.key || id)} disabled={busy}
        aria-invalid={!!errors[props.key || id]} aria-describedby={errors[props.key || id] ? `${id}-err` : undefined} {...props.attrs} />
      {errors[props.key || id] && <span id={`${id}-err`} className="field-error" role="alert">{errors[props.key || id]}</span>}
    </div>
  )

  return (
    <div className="login-page">
      <nav className="pill-nav" aria-label="Main">
        <div className="row" style={{ fontWeight: 800, fontSize: 21, letterSpacing: '-.02em' }}>
          <span className="brand-mark"><GraduationCap size={20} /></span>PlaceMate <span style={{ color: 'var(--violet)' }}>AI</span>
        </div>
        <div style={{ marginLeft: 'auto' }}><Link className="btn ghost sm" to="/login">Log in</Link></div>
      </nav>

      <main className="login-wrap">
        <h1>Create your account</h1>
        <p className="muted" style={{ fontSize: 17, marginTop: 8 }}>Sign up as a student to ask about placement rules, drives and your eligibility.</p>
        <form className="login-card" onSubmit={submit} noValidate>
          <div className="stack" style={{ gap: 18 }}>
            {field('name', 'Full name', 'text', { attrs: { autoComplete: 'name', placeholder: 'Your full name' } })}
            {field('email', 'Email', 'email', { attrs: { autoComplete: 'email', placeholder: 'you@college.edu' } })}
            {field('college', 'College', 'text', { attrs: { autoComplete: 'organization', placeholder: 'Your college name' } })}
            {field('pw', 'Password', 'password', { attrs: { autoComplete: 'new-password', placeholder: `At least ${MIN_PW} characters` } })}
            {field('confirm', 'Confirm password', 'password', { attrs: { autoComplete: 'new-password', placeholder: 'Re-enter your password' } })}
            {err && <p role="alert" className="row" style={{ color: 'var(--red)', fontWeight: 600, alignItems: 'flex-start' }}><AlertCircle size={16} style={{ flex: 'none', marginTop: 2 }} />{err}</p>}
            <button className="btn primary block" style={{ height: 56, fontSize: 16 }} disabled={busy}>{busy ? <><Loader2 size={18} className="spin" />Creating account…</> : 'Create account'}</button>
            <p className="muted" style={{ textAlign: 'center', fontSize: 14 }}>Already have an account? <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600 }}>Log in</Link></p>
          </div>
        </form>
      </main>
    </div>
  )
}
