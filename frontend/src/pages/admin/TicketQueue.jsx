import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Send, Users, BookOpenCheck, Inbox, Sparkles, Bot } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { SEVERITY, COMPLEXITY, CATEGORY } from '../../data/seed'
import { dateTime, timeLeft } from '../../lib/format'
import { Drawer, Empty, SeverityBadge, StatusBadge } from '../../components/ui'

const STAFF = ['Kavita Singh', 'Rahul Mishra', 'Meera Das']

export default function TicketQueue() {
  const { tickets, updateTicket, notify } = useApp()
  const { state } = useLocation()
  const [f, setF] = useState({ q: '', status: 'active', severity: 'all', category: 'all' })
  const [sel, setSel] = useState(state?.open || null)
  const [reply, setReply] = useState('')
  const [reusable, setReusable] = useState(true)

  useEffect(() => { setReply(''); setReusable(true) }, [sel])
  const order = Object.fromEntries(SEVERITY.map((s, i) => [s, i]))
  const rows = useMemo(() => tickets
    .filter((t) => (f.status === 'active' ? t.status !== 'resolved' : f.status === 'all' || t.status === f.status))
    .filter((t) => f.severity === 'all' || t.severity === f.severity)
    .filter((t) => f.category === 'all' || t.category === f.category)
    .filter((t) => (t.question + t.student + t.id).toLowerCase().includes(f.q.toLowerCase()))
    .sort((a, b) => order[a.severity] - order[b.severity] || new Date(a.due) - new Date(b.due)), [tickets, f]) // eslint-disable-line
  const t = tickets.find((x) => x.id === sel)

  const send = () => {
    if (!reply.trim()) return
    updateTicket(t.id, { status: 'resolved', answer: reply.trim(), reusable, reviewed: !reusable ? true : false, resolvedAt: new Date().toISOString() })
    notify(reusable ? 'Reply sent. Queued for knowledge base review' : 'Reply sent to the student')
    setSel(null)
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  return (
    <>
      <div className="page-head"><div><h1>Ticket queue</h1><p>Sorted by severity, then by reply deadline.</p></div></div>
      <div className="card">
        <div className="row wrap" style={{ marginBottom: 14 }}>
          <div className="search grow" style={{ height: 40, minWidth: 220 }}><Search size={16} /><input value={f.q} onChange={set('q')} placeholder="Search by student, ticket or question" aria-label="Search tickets" /></div>
          <select className="select" style={{ width: 150 }} value={f.status} onChange={set('status')} aria-label="Status"><option value="active">Active</option><option value="all">All</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select>
          <select className="select" style={{ width: 150 }} value={f.severity} onChange={set('severity')} aria-label="Severity"><option value="all">All severities</option>{SEVERITY.map((s) => <option key={s}>{s}</option>)}</select>
          <select className="select" style={{ width: 150 }} value={f.category} onChange={set('category')} aria-label="Category"><option value="all">All categories</option>{CATEGORY.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        {rows.length === 0 ? <Empty icon={Inbox} title="Nothing in this view" text="Change the filters, or enjoy the quiet. Students get instant answers for everything the documents cover." /> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Ticket</th><th>Question</th><th>Severity</th><th>Complexity</th><th>Category</th><th>Reply by</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => { const s = timeLeft(r.due); return (
                <tr key={r.id} className={`click ${sel === r.id ? 'sel' : ''}`} onClick={() => setSel(r.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSel(r.id)}>
                  <td><b>{r.id}</b><div className="small faint">{r.student}</div></td>
                  <td style={{ maxWidth: 340 }}><div className="trunc">{r.question}</div>{r.merged > 1 && <span className="badge gray" style={{ marginTop: 4 }}><Users size={12} />{r.merged} merged</span>}</td>
                  <td><SeverityBadge value={r.severity} /></td><td><span className="badge violet">{r.complexity}</span></td><td>{r.category}</td>
                  <td><span className={`sla ${r.status === 'resolved' ? '' : s.overdue ? 'late' : s.hours < 6 ? 'soon' : 'ok'}`}>{r.status === 'resolved' ? '—' : s.overdue ? `Overdue ${s.text}` : s.text}</span></td>
                  <td><StatusBadge value={r.status} /></td>
                </tr>) })}
            </tbody></table></div>
        )}
      </div>

      {t && (
        <Drawer title={`${t.id} · ${t.student}`} onClose={() => setSel(null)}>
          <div className="row wrap"><SeverityBadge value={t.severity} /><span className="badge violet">{t.complexity}</span><span className="badge">{t.category}</span><StatusBadge value={t.status} />{t.merged > 1 && <span className="badge gray"><Users size={12} />{t.merged} students asked</span>}</div>
          <div className="card" style={{ background: 'var(--blue-50)', boxShadow: 'none' }}><div className="small faint" style={{ marginBottom: 4 }}>Student question · {t.branch} · {dateTime(t.created)}</div><p style={{ fontWeight: 600 }}>{t.question}</p></div>
          <div className="callout warn"><Bot size={18} style={{ flex: 'none' }} /><div><b>Why the assistant escalated</b><p>{t.reason}. Confidence {Math.round((t.confidence ?? 0.2) * 100)}%.</p></div></div>
          <div className="grid g2" style={{ gap: 12 }}>
            <div className="field"><label htmlFor="as">Assigned to</label><select id="as" className="select" value={t.assignee} onChange={(e) => { updateTicket(t.id, { assignee: e.target.value }); notify(`Assigned to ${e.target.value}`) }}>{STAFF.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label htmlFor="sv">Severity</label><select id="sv" className="select" value={t.severity} onChange={(e) => updateTicket(t.id, { severity: e.target.value })}>{SEVERITY.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label htmlFor="cx">Complexity</label><select id="cx" className="select" value={t.complexity} onChange={(e) => updateTicket(t.id, { complexity: e.target.value })}>{COMPLEXITY.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label htmlFor="ct">Category</label><select id="ct" className="select" value={t.category} onChange={(e) => updateTicket(t.id, { category: e.target.value })}>{CATEGORY.map((s) => <option key={s}>{s}</option>)}</select></div>
          </div>
          {t.status === 'resolved' ? (
            <div className="callout" style={{ background: 'var(--green-50)', borderColor: '#bfe8cf', color: '#0b5a2c' }}><div><b>Reply sent</b><p style={{ marginTop: 4 }}>{t.answer}</p><p className="small" style={{ marginTop: 6 }}>{t.reusable ? (t.reviewed ? 'Added to the knowledge base.' : 'Waiting in Answer review.') : 'Marked one-off. Not reused.'}</p></div></div>
          ) : (
            <>
              <div className="field"><label htmlFor="rp">Your reply</label><textarea id="rp" className="textarea" rows={5} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a clear answer the student can act on." /></div>
              <div className="row"><button type="button" role="switch" aria-checked={reusable} aria-label="Reusable answer" className={`switch ${reusable ? 'on' : ''}`} onClick={() => setReusable(!reusable)} />
                <div><b>Reusable answer</b><div className="small muted">{reusable ? 'Goes to Answer review, then into the knowledge base.' : 'One-off. Only this student sees it.'}</div></div></div>
              <div className="row"><button className="btn solid" onClick={send} disabled={!reply.trim()}><Send size={16} />Send reply</button>
                {t.status === 'open' && <button className="btn ghost" onClick={() => { updateTicket(t.id, { status: 'in_progress' }); notify('Marked as in progress') }}>Start working</button>}</div>
            </>
          )}
        </Drawer>
      )}
    </>
  )
}
