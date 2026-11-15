import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { GraduationCap, UserRound, ClipboardList, Loader2, AlertCircle, Info } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { FEATURES } from '../config'
import { ROLE_HOME } from '../auth/roles'

// The role selected here only picks demo credentials; the backend response decides where the user lands.
const ROLES = [
  ['student', 'Student', UserRound, 'you@college.edu'],
  ['admin', 'College admin', ClipboardList, 'tnp@college.edu'],
]
const DEMO_ACCOUNTS = {
  student: { email: 'rohan.sharma@kiit.ac.in', password: 'student123' },
  admin: { email: 'tnp@kiit.ac.in', password: 'admin123' },
}

export default function Login() {
  const { user, login, devLogin } = useApp()
  const { state } = useLocation()
  const [role, setRole] = useState('student')
  const [email, setEmail] = useState(DEMO_ACCOUNTS.student.email)
  const [pw, setPw] = useState(DEMO_ACCOUNTS.student.password)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const r = ROLES.find((x) => x[0] === role)
  const selectRole = (id) => {
    setRole(id)
    const account = DEMO_ACCOUNTS[id]
    if (account) {
      setEmail(account.email)
      setPw(account.password)
      setErr('')
    }
  }

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
        <span className="muted">Demo authentication</span>
      </nav>

      <main className="login-wrap">
        <h1>Welcome back</h1>
        <p className="muted" style={{ fontSize: 17, marginTop: 8 }}>Log in to ask about placement rules, drives and your eligibility.</p>
        <form className="login-card" onSubmit={submit} noValidate>
          {state?.reason === 'expired' && (
            <div className="callout warn" role="status" style={{ marginBottom: 18 }}><Info size={18} style={{ flex: 'none' }} /><span>Your session ended. Log in again to continue.</span></div>
          )}
          <div className="role-pick" role="radiogroup" aria-label="Sign in as" style={{ gridTemplateColumns: `repeat(${ROLES.length}, 1fr)` }}>
            {ROLES.map(([id, label, Icon]) => (
              <button type="button" key={id} role="radio" aria-checked={role === id} className={role === id ? 'on' : ''} onClick={() => selectRole(id)}><Icon size={20} />{label}</button>
            ))}
          </div>
          <div className="stack" style={{ gap: 18 }}>
            <div className="field"><label htmlFor="email">Email</label><input id="email" className="input" type="email" autoComplete="email" placeholder={r[3]} value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} aria-invalid={!!err} aria-describedby={err ? 'login-err' : undefined} /></div>
            <div className="field"><label htmlFor="pw">Password</label><input id="pw" className="input" type="password" autoComplete="current-password" placeholder="Your password" value={pw} onChange={(e) => setPw(e.target.value)} disabled={busy} /></div>
            {err && <p id="login-err" role="alert" className="row" style={{ color: 'var(--red)', fontWeight: 600, alignItems: 'flex-start' }}><AlertCircle size={16} style={{ flex: 'none', marginTop: 2 }} />{err}</p>}
            <button className="btn primary block" style={{ height: 56, fontSize: 16 }} disabled={busy}>{busy ? <><Loader2 size={18} className="spin" />Logging in…</> : 'Log in'}</button>
          </div>
          <div className="callout" role="note" style={{ marginTop: 18 }}>
            Demo accounts only: <b>rohan.sharma@kiit.ac.in / student123</b> (student) and <b>tnp@kiit.ac.in / admin123</b> (admin).
          </div>
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
