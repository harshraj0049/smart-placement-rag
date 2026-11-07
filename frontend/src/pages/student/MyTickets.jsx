import { useState } from 'react'
import { CheckCircle2, Clock, MessageSquareText, Sparkles } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { dateTime, timeLeft } from '../../lib/format'
import { Empty, SeverityBadge, StatusBadge } from '../../components/ui'
import { useNavigate } from 'react-router-dom'

export default function MyTickets() {
  const { tickets, student } = useApp()
  const nav = useNavigate()
  const [tab, setTab] = useState('all')
  const mine = tickets.filter((t) => t.student === student.name).filter((t) => tab === 'all' || (tab === 'open' ? t.status !== 'resolved' : t.status === 'resolved'))
  return (
    <>
      <div className="page-head"><div><h1>My Questions to T&amp;P</h1><p>Questions the assistant could not answer reliably, and the staff replies.</p></div>
        <div className="tabs">{[['all', 'All'], ['open', 'Waiting'], ['done', 'Answered']].map(([v, l]) => <button key={v} className={`tab ${tab === v ? 'on' : ''}`} onClick={() => setTab(v)}>{l}</button>)}</div></div>
      {mine.length === 0 ? (
        <div className="card"><Empty icon={MessageSquareText} title="No questions here" text="When the assistant is not sure, it sends the question to the T&P cell and you can follow it here."><button className="btn primary" onClick={() => nav('/app/assistant')}><Sparkles size={16} />Ask the assistant</button></Empty></div>
      ) : (
        <div className="stack">
          {mine.map((t) => {
            const sla = timeLeft(t.due)
            return (
              <div className="card" key={t.id}>
                <div className="row wrap between"><div className="row wrap"><b>{t.id}</b><SeverityBadge value={t.severity} /><StatusBadge value={t.status} /><span className="badge violet">{t.complexity}</span></div><span className="small faint">Raised {dateTime(t.created)}</span></div>
                <p style={{ margin: '12px 0', fontWeight: 600 }}>{t.question}</p>
                {t.answer ? (
                  <div className="callout" style={{ background: 'var(--green-50)', borderColor: '#bfe8cf', color: '#0b5a2c' }}><CheckCircle2 size={18} style={{ flex: 'none' }} /><div><b>Reply from {t.assignee}</b><p style={{ marginTop: 4 }}>{t.answer}</p></div></div>
                ) : (
                  <div className="row small muted"><Clock size={15} />Assigned to {t.assignee} · {sla.overdue ? 'Reply is overdue' : `Reply expected within ${sla.text}`}{t.merged > 1 && ` · ${t.merged} students asked this`}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
