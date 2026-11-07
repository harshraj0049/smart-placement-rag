import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ADMIN, DRIVES, STUDENT, SUPER, TENANTS, TICKETS_SEED, SLA_HOURS } from '../data/seed'
import { FEATURES } from '../config'
import { clearSession, isTokenExpired, loadSession, saveSession } from '../auth/session'
import { login as loginRequest } from '../api/auth'
import { setUnauthorizedHandler } from '../api/http'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

// Used ONLY by the pages outside the immediate MVP (tickets, platform console, sample companies/eligibility).
// These slices are demo data kept in the browser; they are never presented as backend data.
function usePersisted(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : initial
    } catch { return initial }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage full or blocked */ } }, [key, value])
  return [value, setValue]
}

const DEV_USERS = { student: STUDENT, admin: ADMIN, super: SUPER }

function initialUser() {
  const s = loadSession()
  if (!s?.user) return null
  if (s.user.devLogin && !FEATURES.devLogin) { clearSession(); return null } // dev sessions never survive into a real build
  if (s.token && isTokenExpired(s.token)) { clearSession(); return null }
  return s.user
}

export function AppProvider({ children }) {
  const nav = useNavigate()
  const [user, setUser] = useState(initialUser)
  const [toast, setToast] = useState(null)

  // Chat state lives here so the docked chat on the dashboard and the full assistant page share one conversation.
  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [chatBusy, setChatBusy] = useState(false)

  // Demo-only slices (see note above).
  const [student, setStudent] = usePersisted('pm.student', STUDENT)
  const [tickets, setTickets] = usePersisted('pm.tickets', TICKETS_SEED)
  const [tenants, setTenants] = usePersisted('pm.tenants', TENANTS)
  const [drives] = useState(DRIVES)

  // Remove keys written by the earlier all-mock version so stale fake documents/history never reappear.
  useEffect(() => { ;['pm.user', 'pm.docs', 'pm.history'].forEach((k) => { try { localStorage.removeItem(k) } catch { /* ignore */ } }) }, [])

  const notify = useCallback((text, tone = 'ok') => setToast({ text, tone, id: Date.now() }), [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const resetChat = useCallback(() => { setMessages([]); setConversationId(null) }, [])
  const logout = useCallback(() => { clearSession(); setUser(null); resetChat() }, [resetChat])

  // Real login: the token and user come from the backend (see api/auth.js for what is still unconfirmed).
  const login = useCallback(async ({ email, password }) => {
    const { token, user: u } = await loginRequest({ email, password })
    const next = { ...u, email: u.email || email }
    saveSession({ token, user: next })
    setUser(next)
    return next
  }, [])

  // Dev-only: lets you look at the screens without a backend. Requests carry no token.
  const devLogin = useCallback((role) => {
    if (!FEATURES.devLogin) return null
    const next = { ...DEV_USERS[role], devLogin: true }
    saveSession({ token: null, user: next })
    setUser(next)
    return next
  }, [])

  // Expired or rejected token: clear the session and send the person to log in again.
  const expireSession = useCallback(() => {
    logout()
    nav('/login', { replace: true, state: { reason: 'expired' } })
  }, [logout, nav])
  useEffect(() => {
    setUnauthorizedHandler(expireSession)
    return () => setUnauthorizedHandler(null)
  }, [expireSession])
  useEffect(() => {
    if (!user) return undefined
    const t = setInterval(() => {
      const s = loadSession()
      if (s?.token && isTokenExpired(s.token)) expireSession()
    }, 30000)
    return () => clearInterval(t)
  }, [user, expireSession])

  const addTicket = (t) => {
    const id = `T-${1043 + tickets.filter((x) => Number(x.id.slice(2)) >= 1043).length}`
    const due = new Date(Date.now() + SLA_HOURS[t.severity] * 3600000).toISOString()
    const ticket = { id, status: 'open', assignee: 'Kavita Singh', merged: 1, reusable: null, answer: null, created: new Date().toISOString(), due, ...t }
    setTickets((all) => [ticket, ...all])
    return ticket
  }
  const updateTicket = (id, patch) => setTickets((all) => all.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const addTenant = (t) => setTenants((all) => [...all, t])
  const resetDemo = () => {
    ;['pm.tickets', 'pm.tenants', 'pm.student'].forEach((k) => localStorage.removeItem(k))
    setTickets(TICKETS_SEED); setTenants(TENANTS); setStudent(STUDENT)
    notify('Demo data reset')
  }

  const value = useMemo(() => ({
    user, login, devLogin, logout, toast, notify,
    messages, setMessages, conversationId, setConversationId, chatBusy, setChatBusy, startNewChat: resetChat,
    student, setStudent, tickets, addTicket, updateTicket, drives, tenants, addTenant, resetDemo,
  }), [user, toast, messages, conversationId, chatBusy, student, tickets, drives, tenants, login, devLogin, logout, resetChat, notify]) // eslint-disable-line
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
