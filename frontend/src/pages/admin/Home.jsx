import { useNavigate } from 'react-router-dom'
import { Users, Ticket, Bot, Library, Clock, UserPlus, Upload, Download, CalendarClock, AlertTriangle, TrendingUp } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { CardHead, SeverityBadge, Stat } from '../../components/ui'
import { timeLeft } from '../../lib/format'

export default function AdminHome() {
  const { tickets, docs, drives, notify } = useApp()
  const nav = useNavigate()
  const open = tickets.filter((t) => t.status !== 'resolved')
  const crit = open.filter((t) => t.severity === 'Critical').length
  const urgent = [...open].sort((a, b) => new Date(a.due) - new Date(b.due)).slice(0, 3)
  const topAsked = [...tickets].sort((a, b) => b.merged - a.merged).slice(0, 3)
  const noAnswer = open.filter((t) => timeLeft(t.due).overdue).length

  return (
    <>
      <div className="page-head"><div><h1>Dashboard</h1><p>What needs the T&amp;P cell today.</p></div><div className="tabs"><button className="tab on">Overview</button><button className="tab" onClick={() => nav('/admin/analytics')}>Analytics</button></div></div>
      <div className="grid g4">
        <Stat tinted tone="blue" icon={Ticket} label="Open tickets" value={open.length} delta={crit ? `${crit} critical` : undefined} />
        <Stat tinted tone="green" icon={Bot} label="Answered by AI" value="84%" delta="+6.2%" />
        <Stat tinted tone="orange" icon={TrendingUp} label="Escalation rate" value="16%" delta="−25 pts" />
        <Stat tinted tone="purple" icon={Library} label="Indexed documents" value={docs.filter((d) => d.status === 'indexed').length} />
      </div>

      <div className="card" style={{ margin: '18px 0' }}>
        <CardHead title="Quick actions"><span className="small muted">Common actions and shortcuts</span></CardHead>
        <div className="quick" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            ['Upload document', 'Notices, policies, FAQs', Upload, '#e6edff', '#2d5bff', () => nav('/admin/knowledge', { state: { upload: true } })],
            ['Answer tickets', `${open.length} waiting`, Ticket, '#e7f7ee', '#12a150', () => nav('/admin/tickets')],
            ['Review answers', 'Add to knowledge base', Library, '#fff0dd', '#ea7a0c', () => nav('/admin/review')],
            ['Invite staff', 'Add TnP members', UserPlus, '#eeebff', '#5b4bff', () => notify('Invite link copied')],
            ['Export report', 'Tickets and usage', Download, '#e6edff', '#2d5bff', () => notify('Report downloaded')],
          ].map(([t, s, I, bg, c, fn]) => <button key={t} onClick={fn}><span className="qi" style={{ background: bg, color: c }}><I size={22} /></span><b>{t}</b><span>{s}</span></button>)}
        </div>
      </div>

      <div className="grid g3" style={{ alignItems: 'start' }}>
        <div className="card">
          <CardHead icon={Clock} title="Reply deadlines" tone="#e5484d"><span className="small muted">By severity SLA</span></CardHead>
          {urgent.length === 0 ? <p className="muted">No open tickets.</p> : urgent.map((t) => {
            const s = timeLeft(t.due)
            return (
              <button key={t.id} className="li" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav('/admin/tickets', { state: { open: t.id } })}>
                <div className="grow"><div className="row between"><b className="trunc">{t.id} · {t.category}</b><span className={`sla ${s.overdue ? 'late' : s.hours < 6 ? 'soon' : 'ok'}`}>{s.overdue ? 'Overdue' : `${s.text} left`}</span></div>
                  <div className="small muted trunc">{t.question}</div><div className="row" style={{ marginTop: 6 }}><SeverityBadge value={t.severity} /></div></div>
              </button>
            )
          })}
        </div>
        <div className="card">
          <CardHead icon={Users} title="Most asked right now" tone="#12a150"><span className="small muted">Questions merged into one ticket</span></CardHead>
          {topAsked.map((t) => <div className="li" key={t.id}><div className="grow"><div className="trunc strong" style={{ fontSize: 13 }}>{t.question}</div><div className="small muted">{t.category} · {t.status === 'resolved' ? 'Answered' : 'Waiting'}</div></div><span className="badge">{t.merged} students</span></div>)}
        </div>
        <div className="card">
          <CardHead icon={AlertTriangle} title="Needs attention" tone="#d97706"><span className="small muted">Fix these to cut escalations</span></CardHead>
          <div className="li"><div className="grow"><b>{noAnswer} overdue {noAnswer === 1 ? 'ticket' : 'tickets'}</b><div className="small muted">Past their reply deadline</div></div><button className="link" onClick={() => nav('/admin/tickets')}>Open</button></div>
          <div className="li"><div className="grow"><b>{tickets.filter((t) => t.reusable && !t.reviewed).length} answers to review</b><div className="small muted">Marked reusable by staff</div></div><button className="link" onClick={() => nav('/admin/review')}>Review</button></div>
          <div className="li"><div className="grow"><b>{drives.filter((d) => timeLeft(d.deadline).hours < 48).length} drives close within 2 days</b><div className="small muted">Check the notices are indexed</div></div><button className="link" onClick={() => nav('/admin/knowledge')}>Check</button></div>
        </div>
      </div>
    </>
  )
}
