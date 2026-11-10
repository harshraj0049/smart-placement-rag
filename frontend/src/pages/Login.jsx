import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { GraduationCap, UserRound, ClipboardList, Boxes, Loader2, AlertCircle, Info } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { FEATURES } from '../config'
import { ROLE_HOME } from '../auth/roles'

// The tab only changes the placeholder. The role that decides where you land comes from the backend after login.
const ROLES = [
  ['student', 'Student', UserRound, 'you@college.edu'],
  ['admin', 'College admin', ClipboardList, 'tnp@college.edu'],
  ...(FEATURES.futurePages ? [['super', 'Platform admin', Boxes, 'root@placemate.ai']] : []),
]

export default function Login() {
  const { user, login, devLogin } = useApp()
  const { state } = useLocation()
  const [role, setRole] = useState('student')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const r = ROLES.find((x) => x[0] === role)

  if (user) {
    const home = ROLE_HOME[user.role]
    const back = state?.from
    return <Navigate to={back && back.startsWith(home) ? back : home} replace />
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const mail = email.trim()
    if (!mail) return setErr('Enter your email address.')
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setErr('Enter a valid email address, for example you@college.edu.')
    if (!pw) return setErr('Enter your password.')
    setErr(''); setBusy(true)
    try { await login({ email: mail, password: pw }) } // on success `user` is set and the redirect above runs
    catch (ex) { setErr(ex.message || 'Could not log in. Try again.') }
    finally { setBusy(false) }
  }

  return (
    <div className="login-page">
      <nav className="pill-nav" aria-label="Main">
        <div className="row" style={{ fontWeight: 800, fontSize: 21, letterSpacing: '-.02em' }}>
          <span className="brand-mark"><GraduationCap size={20} /></span>PlaceMate <span style={{ color: 'var(--violet)' }}>AI</span>
        </div>
        <div className="links"><a href="#features">Features</a><a href="#privacy">Privacy</a><a href="#how">How it works</a></div>
        <Link className="btn primary sm" to="/register">Sign up</Link>
      </nav>

      <main className="login-wrap">
        <h1>Welcome back</h1>
        <p className="muted" style={{ fontSize: 17, marginTop: 8 }}>Log in to ask about placement rules, drives and your eligibility.</p>
        <form className="login-card" onSubmit={submit} noValidate>
          {state?.reason === 'expired' && (
            <div className="callout warn" role="status" style={{ marginBottom: 18 }}><Info size={18} style={{ flex: 'none' }} /><span>Your session ended. Log in again to continue.</span></div>
          )}
          {state?.registered && (
            <div className="callout ok" role="status" style={{ marginBottom: 18 }}><Info size={18} style={{ flex: 'none' }} /><span>Account created. Log in to continue.</span></div>
          )}
          <div className="role-pick" role="radiogroup" aria-label="Sign in as" style={{ gridTemplateColumns: `repeat(${ROLES.length}, 1fr)` }}>
            {ROLES.map(([id, label, Icon]) => (
              <button type="button" key={id} role="radio" aria-checked={role === id} className={role === id ? 'on' : ''} onClick={() => setRole(id)}><Icon size={20} />{label}</button>
            ))}
          </div>
          <div className="stack" style={{ gap: 18 }}>
            <div className="field"><label htmlFor="email">Email</label><input id="email" className="input" type="email" autoComplete="email" placeholder={r[3]} value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} aria-invalid={!!err} aria-describedby={err ? 'login-err' : undefined} /></div>
            <div className="field"><label htmlFor="pw">Password</label><input id="pw" className="input" type="password" autoComplete="current-password" placeholder="Your password" value={pw} onChange={(e) => setPw(e.target.value)} disabled={busy} /></div>
            {err && <p id="login-err" role="alert" className="row" style={{ color: 'var(--red)', fontWeight: 600, alignItems: 'flex-start' }}><AlertCircle size={16} style={{ flex: 'none', marginTop: 2 }} />{err}</p>}
            <button className="btn primary block" style={{ height: 56, fontSize: 16 }} disabled={busy}>{busy ? <><Loader2 size={18} className="spin" />Logging in…</> : 'Log in'}</button>
          </div>
          <p className="muted" style={{ textAlign: 'center', fontSize: 14, marginTop: 18 }}>New student? <Link to="/register" style={{ color: 'var(--blue)', fontWeight: 600 }}>Create an account</Link></p>
          {FEATURES.devLogin && (
            <div className="dev-box">
              <b>Development only.</b> Skip login to look at the screens. Requests are sent without a token, so the backend will refuse them.
              <div className="row wrap" style={{ marginTop: 8 }}>
                {ROLES.map(([id, label]) => <button key={id} type="button" className="btn ghost sm" onClick={() => devLogin(id)}>Enter as {label.toLowerCase()}</button>)}
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  )
}
