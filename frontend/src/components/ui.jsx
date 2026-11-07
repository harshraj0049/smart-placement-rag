import { useEffect } from 'react'
import { X, Inbox, Info } from 'lucide-react'
import { initials } from '../lib/format'

export const Avatar = ({ name, size = 36 }) => <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials(name)}</div>

const COLORS = ['#2d5bff', '#12a150', '#e5484d', '#d97706', '#5b4bff', '#0891b2', '#be185d']
export function CompanyLogo({ name, size = 44 }) {
  const c = COLORS[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length]
  return <div className="logo" style={{ background: c, width: size, height: size }} aria-hidden>{name[0]}</div>
}

const SEV = { Critical: 'red', High: 'amber', Normal: '', Low: 'gray' }
export const SeverityBadge = ({ value }) => <span className={`badge ${SEV[value] ?? ''}`}><i className={`dot ${value === 'Critical' ? 'red' : value === 'High' ? 'amber' : ''}`} style={value === 'Low' ? { background: '#94a3b8' } : null} />{value}</span>
const STAT = { open: ['Open', 'amber'], in_progress: ['In progress', ''], resolved: ['Resolved', 'green'] }
export const StatusBadge = ({ value }) => { const [t, c] = STAT[value] || [value, 'gray']; return <span className={`badge ${c}`}>{t}</span> }

export function Stat({ icon: Icon, tone = 'blue', value, label, delta, tinted }) {
  const bg = { blue: ['#e6edff', '#2d5bff'], green: ['#e7f7ee', '#12a150'], orange: ['#fff0dd', '#ea7a0c'], purple: ['#eeebff', '#5b4bff'], red: ['#fdecec', '#e5484d'] }[tone]
  if (tinted) {
    return (
      <div className={`stat tint ${tone}`}>
        <div className="ico" style={{ background: bg[1], color: '#fff', borderRadius: '50%' }}><Icon size={24} /></div>
        <div>
          <div className="label">{label.toUpperCase()}</div>
          <b style={{ margin: '6px 0 2px' }}>{value}{delta && <span className="delta">{delta}</span>}</b>
        </div>
      </div>
    )
  }
  return (
    <div className="stat">
      <div className="ico" style={{ background: bg[0], color: bg[1] }}><Icon size={26} /></div>
      <div><b>{value}</b><span>{label}</span></div>
    </div>
  )
}

export function CardHead({ icon: Icon, title, children, tone = '#2d5bff' }) {
  return (
    <div className="card-head">
      <h3 className="card-title">{Icon && <Icon size={18} color={tone} />}{title}</h3>
      {children}
    </div>
  )
}

function useEsc(onClose) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])
}
export function Drawer({ title, onClose, children }) {
  useEsc(onClose)
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="row between"><h2 style={{ fontSize: 20, fontWeight: 800 }}>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        {children}
      </aside>
    </div>
  )
}
export function Modal({ title, onClose, children }) {
  useEsc(onClose)
  return (
    <div className="overlay center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="row between"><h2 style={{ fontSize: 20, fontWeight: 800 }}>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  )
}
export const Empty = ({ icon: Icon = Inbox, title, text, children }) => (
  <div className="empty"><div className="ei"><Icon size={26} /></div><b style={{ color: 'var(--ink)' }}>{title}</b><p style={{ maxWidth: 360 }}>{text}</p>{children}</div>
)

export const Switch = ({ on, onChange, label }) => <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />

// Tiny renderer for **bold** and "- " bullet lists in assistant answers (no raw HTML is ever injected).
export function RichText({ text }) {
  const inline = (s) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p))
  const blocks = []
  let list = []
  text.split('\n').forEach((line, i) => {
    if (line.startsWith('- ')) list.push(<li key={i}>{inline(line.slice(2))}</li>)
    else {
      if (list.length) { blocks.push(<ul key={`u${i}`}>{list}</ul>); list = [] }
      if (line.trim()) blocks.push(<p key={i}>{inline(line)}</p>)
    }
  })
  if (list.length) blocks.push(<ul key="end">{list}</ul>)
  return <>{blocks}</>
}

export function Toast({ toast }) {
  if (!toast) return null
  return <div className="toast" role="status">{toast.text}</div>
}

// Marks content that is demo data and not from the backend, so it is never mistaken for real data.
export const SampleBadge = () => <span className="badge amber" title="Demo data, not from the backend">Sample data</span>
export const SampleNote = ({ children }) => (
  <div className="callout warn"><Info size={18} style={{ flex: 'none' }} /><span>{children || 'Sample data. This page is not connected to the backend yet.'}</span></div>
)
