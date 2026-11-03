import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ADMIN, CHAT_HISTORY_SEED, DOCS, DRIVES, STUDENT, SUPER, TENANTS, TICKETS_SEED, SLA_HOURS } from '../data/seed'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

// Everything is persisted in localStorage so the student -> TnP -> student loop
// (escalate, answer, reuse) can be demonstrated without a backend.
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

const USERS = { student: STUDENT, admin: ADMIN, super: SUPER }

export function AppProvider({ children }) {
  const [user, setUser] = usePersisted('pm.user', null)
  const [student, setStudent] = usePersisted('pm.student', STUDENT)
  const [tickets, setTickets] = usePersisted('pm.tickets', TICKETS_SEED)
  const [docs, setDocs] = usePersisted('pm.docs', DOCS)
  const [drives] = useState(DRIVES)
  const [tenants, setTenants] = usePersisted('pm.tenants', TENANTS)
  const [history, setHistory] = usePersisted('pm.history', CHAT_HISTORY_SEED)
  const [messages, setMessages] = useState([])
  const [toast, setToast] = useState(null)

  const notify = useCallback((text, tone = 'ok') => {
    setToast({ text, tone, id: Date.now() })
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const login = (role, email) => {
    const base = USERS[role]
    setUser({ ...base, email: email || base.email })
  }
  const logout = () => { setUser(null); setMessages([]) }

  const addTicket = (t) => {
    const id = `T-${1043 + tickets.filter((x) => Number(x.id.slice(2)) >= 1043).length}`
    const due = new Date(Date.now() + SLA_HOURS[t.severity] * 3600000).toISOString()
    // Near-duplicate merge: same category + identical question text -> bump the counter on the existing ticket.
    const dup = tickets.find((x) => x.status !== 'resolved' && x.question.trim().toLowerCase() === t.question.trim().toLowerCase())
    if (dup) {
      setTickets((all) => all.map((x) => (x.id === dup.id ? { ...x, merged: x.merged + 1 } : x)))
      return { ...dup, merged: dup.merged + 1, duplicate: true }
    }
    const ticket = { id, status: 'open', assignee: 'Kavita Singh', merged: 1, reusable: null, answer: null, created: new Date().toISOString(), due, ...t }
    setTickets((all) => [ticket, ...all])
    return ticket
  }
  const updateTicket = (id, patch) => setTickets((all) => all.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const addDoc = (d) => setDocs((all) => [d, ...all])
  const updateDoc = (id, patch) => setDocs((all) => all.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const removeDoc = (id) => setDocs((all) => all.filter((x) => x.id !== id))
  const addTenant = (t) => setTenants((all) => [...all, t])

  const startNewChat = () => {
    const firstUser = messages.find((m) => m.role === 'user')
    if (firstUser) setHistory((h) => [{ id: `c${Date.now()}`, title: firstUser.text.slice(0, 70), when: new Date().toISOString() }, ...h].slice(0, 30))
    setMessages([])
  }
  const resetDemo = () => {
    ;['pm.tickets', 'pm.docs', 'pm.tenants', 'pm.history', 'pm.student'].forEach((k) => localStorage.removeItem(k))
    setTickets(TICKETS_SEED); setDocs(DOCS); setTenants(TENANTS); setHistory(CHAT_HISTORY_SEED); setStudent(STUDENT); setMessages([])
    notify('Demo data reset')
  }

  const value = useMemo(() => ({
    user, login, logout, student, setStudent, tickets, addTicket, updateTicket, docs, addDoc, updateDoc, removeDoc, drives,
    tenants, addTenant, history, messages, setMessages, startNewChat, resetDemo, toast, notify,
  }), [user, student, tickets, docs, drives, tenants, history, messages, toast]) // eslint-disable-line
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
