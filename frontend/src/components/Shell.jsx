import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  GraduationCap, LayoutDashboard, MessageSquareText, ShieldCheck, Building2, FileText, History, Settings, Bell, Search, ChevronDown,
  LogOut, Menu, Ticket, Library, BarChart3, ClipboardCheck, Sparkles, Globe2, Boxes, Users,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Avatar, Toast } from './ui'

const NAV = {
  student: [
    ['/app', 'Dashboard', LayoutDashboard, true], ['/app/assistant', 'AI Placement Assistant', MessageSquareText], ['/app/eligibility', 'My Eligibility', ShieldCheck],
    ['/app/companies', 'Companies', Building2], ['/app/guidelines', 'Placement Guidelines', FileText], ['/app/tickets', 'My Questions', Ticket],
    ['/app/history', 'Chat History', History], ['/app/settings', 'Profile & Settings', Settings],
  ],
  admin: [
    ['/admin', 'Home', LayoutDashboard, true], ['/admin/tickets', 'Ticket queue', Ticket], ['/admin/knowledge', 'Knowledge base', Library],
    ['/admin/review', 'Answer review', ClipboardCheck], ['/admin/analytics', 'Analytics', BarChart3], ['/admin/settings', 'Settings', Settings],
  ],
  super: [['/platform', 'Colleges', Boxes, true], ['/platform/isolation', 'Isolation tests', ShieldCheck], ['/platform/users', 'Platform users', Users]],
}

export default function Shell({ variant }) {
  const { user, logout, tickets, docs, toast, drives } = useApp()
  const nav = useNavigate()
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const [q, setQ] = useState('')
  const menuRef = useRef(null)
  const light = variant !== 'student'

  useEffect(() => setOpen(false), [loc.pathname])
  useEffect(() => {
    const h = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const openTickets = tickets.filter((t) => t.status !== 'resolved').length
  const reviewCount = tickets.filter((t) => t.status === 'resolved' && t.reusable && !t.reviewed).length
  const urgent = drives.filter((d) => new Date(d.deadline) - Date.now() < 86400000 * 2).length
  const badge = { '/admin/tickets': openTickets, '/admin/review': reviewCount }

  const submitSearch = (e) => {
    e.preventDefault()
    if (!q.trim()) return
    nav('/app/assistant', { state: { ask: q.trim() } })
    setQ('')
  }

  return (
    <div className="shell">
      <div className="mobile-bar"><button className="icon-btn" style={{ color: '#fff' }} onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>PlaceMate AI</div>
      <aside className={`sidebar ${light ? 'light' : ''} ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-row">{variant === 'student' ? <GraduationCap size={34} /> : <span className="brand-mark"><GraduationCap size={20} /></span>}PlaceMate AI</div>
          <small>{variant === 'student' ? 'Smart Campus Placement Assistant' : variant === 'admin' ? 'TnP console · KIIT' : 'Platform console'}</small>
        </div>
        {NAV[variant].map(([to, label, Icon, end]) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav ${isActive ? 'active' : ''}`}>
            <Icon size={19} />{label}{badge[to] > 0 && <span className="count">{badge[to]}</span>}
          </NavLink>
        ))}
        <div className="side-foot">
          {variant === 'student' ? (
            <div className="help-card">
              <b>Need help?</b>
              <p>Ask the assistant. If it is not sure, it sends your question to the T&amp;P cell.</p>
              <button className="btn solid sm" onClick={() => nav('/app/assistant')}><Sparkles size={14} />Ask a question</button>
            </div>
          ) : (
            <div className="row small faint" style={{ padding: '0 10px' }}><Globe2 size={15} />{variant === 'admin' ? 'Tenant: kiit' : 'All tenants'}</div>
          )}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          {variant === 'student' ? (
            <form className="search" onSubmit={submitSearch} role="search">
              <Search size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for policies, companies or questions…" aria-label="Search" />
            </form>
          ) : (
            <div className="crumbs grow"><LayoutDashboard size={16} />/ {variant === 'admin' ? 'Admin' : 'Platform'} / {loc.pathname.split('/').filter(Boolean).slice(1).join(' / ') || 'Dashboard'}</div>
          )}
          <div className="grow" />
          <button className="icon-btn" aria-label="Notifications" onClick={() => nav(variant === 'student' ? '/app/companies' : '/admin/tickets')} style={{ position: 'relative' }}>
            <Bell size={20} />
            {(variant === 'student' ? urgent : openTickets) > 0 && <span style={{ position: 'absolute', top: 2, right: 2, background: 'var(--red)', color: '#fff', borderRadius: 999, fontSize: 10, minWidth: 16, height: 16, display: 'grid', placeItems: 'center', fontWeight: 700 }}>{variant === 'student' ? urgent : openTickets}</span>}
          </button>
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button className="user-chip" onClick={() => setMenu(!menu)} aria-haspopup="menu" aria-expanded={menu}>
              <Avatar name={user.name} />
              <span style={{ textAlign: 'left', lineHeight: 1.2 }}><b style={{ display: 'block' }}>{user.name}</b><span className="small faint">{user.role === 'student' ? `B.Tech ${user.branch}` : user.title}</span></span>
              <ChevronDown size={16} className="faint" />
            </button>
            {menu && (
              <div className="menu" role="menu">
                <button onClick={() => { setMenu(false); nav(variant === 'student' ? '/app/settings' : '/admin/settings') }} disabled={variant === 'super'}><Settings size={16} />Settings</button>
                <button onClick={() => { logout(); nav('/login') }}><LogOut size={16} />Log out</button>
              </div>
            )}
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
      <Toast toast={toast} />
    </div>
  )
}
