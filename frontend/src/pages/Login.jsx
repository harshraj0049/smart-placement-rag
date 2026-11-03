import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { GraduationCap, UserRound, ClipboardList, Boxes } from 'lucide-react'
import { useApp } from '../context/AppContext'

const ROLES = [
  ['student', 'Student', UserRound, 'rohan.sharma@kiit.ac.in', '/app'],
  ['admin', 'TnP staff', ClipboardList, 'tnp@kiit.ac.in', '/admin'],
  ['super', 'Platform admin', Boxes, 'root@placemate.ai', '/platform'],
]
const Google = () => (
  <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2.1 1.4-4.7 2.3-7.7 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
)

export default function Login() {
  const { user, login } = useApp()
  const nav = useNavigate()
  const [role, setRole] = useState('student')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const r = ROLES.find((x) => x[0] === role)

  if (user) return <Navigate to={ROLES.find((x) => x[0] === user.role)[4]} replace />

  const submit = (e) => {
    e.preventDefault()
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return setErr('Enter a valid email address, for example you@college.edu.')
    setErr('')
    login(role, email.trim())
    nav(r[4])
  }

  return (
    <div className="login-page">
      <nav className="pill-nav" aria-label="Main">
        <div className="row" style={{ fontWeight: 800, fontSize: 21, letterSpacing: '-.02em' }}>
          <span className="brand-mark"><GraduationCap size={20} /></span>PlaceMate <span style={{ color: 'var(--violet)' }}>AI</span>
        </div>
        <div className="links"><a href="#features">Features</a><a href="#privacy">Privacy</a><a href="#how">How it works</a></div>
        <button className="btn primary sm" onClick={() => document.getElementById('email')?.focus()}>Request access</button>
      </nav>

      <main className="login-wrap">
        <h1>Welcome back</h1>
        <p className="muted" style={{ fontSize: 17, marginTop: 8 }}>Log in to ask about placement rules, drives and your eligibility.</p>
        <form className="login-card" onSubmit={submit} noValidate>
          <div className="role-pick" role="radiogroup" aria-label="Sign in as">
            {ROLES.map(([id, label, Icon]) => (
              <button type="button" key={id} role="radio" aria-checked={role === id} className={role === id ? 'on' : ''} onClick={() => setRole(id)}><Icon size={20} />{label}</button>
            ))}
          </div>
          <button type="button" className="google" onClick={() => { login(role); nav(r[4]) }}><Google />Sign in with Google</button>
          <div className="or">or with email</div>
          <div className="stack" style={{ gap: 18 }}>
            <div className="field"><label htmlFor="email">Email</label><input id="email" className="input" type="email" autoComplete="email" placeholder={r[3]} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err} aria-describedby={err ? 'login-err' : undefined} /></div>
            <div className="field"><label htmlFor="pw">Password</label><input id="pw" className="input" type="password" autoComplete="current-password" placeholder="Your password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
            {err && <p id="login-err" role="alert" style={{ color: 'var(--red)', fontWeight: 600 }}>{err}</p>}
            <div style={{ textAlign: 'right' }}><a href="#reset" style={{ textDecoration: 'underline', fontWeight: 500 }}>Forgot password?</a></div>
            <button className="btn primary block" style={{ height: 56, fontSize: 16 }}>Log in</button>
          </div>
          <p className="small faint" style={{ marginTop: 18, textAlign: 'center' }}>Demo mode: leave the fields empty and press Log in to enter as {r[1].toLowerCase()}.</p>
        </form>
      </main>
    </div>
  )
}
