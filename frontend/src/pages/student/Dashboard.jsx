import { useNavigate } from 'react-router-dom'
import { FileText, ShieldCheck, Building2, CalendarDays, Flame, Megaphone, ArrowRight, Sparkles, Send, MessageCircleQuestion, Upload, GraduationCap, Ticket } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { UPDATES } from '../../data/seed'
import { checkEligibility } from '../../lib/eligibility'
import { ago, shortDate, timeLeft } from '../../lib/format'
import { CardHead, CompanyLogo, Stat } from '../../components/ui'
import ChatPanel from '../../components/ChatPanel'

export default function StudentDashboard() {
  const { user, student, drives, docs, tickets, setMessages } = useApp()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const eligible = drives.filter((d) => checkEligibility(student, d).eligible).length
  const mine = tickets.filter((t) => t.student === student.name && t.status !== 'resolved').length
  const upcoming = [...drives].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 3)

  const ask = (e) => { e.preventDefault(); if (q.trim()) nav('/app/assistant', { state: { ask: q.trim() } }) }

  return (
    <div className="dash-split">
      <div className="stack" style={{ gap: 20 }}>
        <div className="hero">
          <GraduationCap className="art" size={150} color="#2d5bff" strokeWidth={1.1} aria-hidden />
          <h2>{greet}, {user.name.split(' ')[0]}!</h2>
          <p>Ready for your placement journey?</p>
          <form className="ask" onSubmit={ask}>
            <Sparkles size={20} color="var(--blue)" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask anything about placement policies…" aria-label="Ask the assistant" />
            <button className="send" aria-label="Ask" disabled={!q.trim()}><Send size={17} /></button>
          </form>
        </div>

        <div className="grid g4">
          <Stat icon={FileText} value={docs.length} label="Indexed documents" />
          <Stat icon={ShieldCheck} tone="green" value={`${eligible}/${drives.length}`} label="Drives you qualify for" />
          <Stat icon={Building2} tone="purple" value={drives.length} label="Open drives" />
          <Stat icon={mine ? Ticket : CalendarDays} tone="orange" value={mine || upcoming.length} label={mine ? 'Questions with T&P' : 'Upcoming drives'} />
        </div>

        <div className="grid g2">
          <div className="card">
            <CardHead icon={Flame} title="Upcoming recruitment drives" tone="#ea7a0c"><button className="link" onClick={() => nav('/app/companies')}>View all <ArrowRight size={13} /></button></CardHead>
            {upcoming.map((d) => (
              <div className="li" key={d.id}>
                <CompanyLogo name={d.company} />
                <div className="grow"><b>{d.company}</b><div className="small muted trunc">{d.role}</div><div className="small muted">{shortDate(d.date)} · On-campus</div></div>
                {timeLeft(d.deadline).hours < 48 && <span className="badge red">Apply {timeLeft(d.deadline).text}</span>}
              </div>
            ))}
          </div>
          <div className="card">
            <CardHead icon={Megaphone} title="Latest placement updates" tone="#e5484d"><button className="link" onClick={() => nav('/app/guidelines')}>View all <ArrowRight size={13} /></button></CardHead>
            <UpdateList />
          </div>
        </div>

        <div className="card">
          <CardHead title="Quick actions" icon={Flame} tone="#f59e0b" />
          <div className="quick">
            {[
              ['Ask AI assistant', 'Get instant answers', MessageCircleQuestion, '#e6edff', '#2d5bff', '/app/assistant'],
              ['Check eligibility', 'For every drive', ShieldCheck, '#e7f7ee', '#12a150', '/app/eligibility'],
              ['Ask T&P cell', 'See your questions', Upload, '#eeebff', '#5b4bff', '/app/tickets'],
              ['View companies', 'Explore opportunities', Building2, '#fff0dd', '#ea7a0c', '/app/companies'],
            ].map(([t, s, I, bg, c, to]) => (
              <button key={t} onClick={() => nav(to)}><span className="qi" style={{ background: bg, color: c }}><I size={22} /></span><b>{t}</b><span>{s}</span></button>
            ))}
          </div>
        </div>
      </div>
      <ChatPanel docked />
    </div>
  )
}

function UpdateList() {
  return UPDATES.slice(0, 4).map((u) => (
    <div className="li" key={u.id} style={{ padding: '10px 0' }}>
      <i className={`dot ${u.tone === 'blue' ? '' : u.tone}`} />
      <div className="grow"><div style={{ fontWeight: 600, fontSize: 13 }}>{u.text}</div><div className="small faint">{ago(u.when)}</div></div>
    </div>
  ))
}
