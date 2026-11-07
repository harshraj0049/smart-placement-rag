import { useState } from 'react'
import { Search, CalendarDays, Wallet, FileText, CheckCircle2, XCircle, AlarmClock } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { checkEligibility } from '../../lib/eligibility'
import { shortDate, timeLeft } from '../../lib/format'
import { CompanyLogo, Drawer, Empty, SampleNote } from '../../components/ui'
import { useNavigate } from 'react-router-dom'

export default function Companies() {
  const { drives, student } = useApp()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [sel, setSel] = useState(null)
  const list = drives.filter((d) => (d.company + d.role).toLowerCase().includes(q.toLowerCase())).filter((d) => filter === 'all' || (filter === 'eligible' ? checkEligibility(student, d).eligible : d.type === filter))
  const d = drives.find((x) => x.id === sel)
  const r = d && checkEligibility(student, d)

  return (
    <>
      <div className="page-head">
        <div><h1>Companies</h1><p>Every drive with its criteria, deadline and the notice it came from.</p></div>
        <div className="row wrap">
          <div className="search" style={{ height: 40 }}><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies" aria-label="Search companies" /></div>
          <div className="tabs" role="tablist">{[['all', 'All'], ['eligible', 'I qualify'], ['IT', 'IT'], ['Core', 'Core']].map(([v, l]) => <button key={v} role="tab" aria-selected={filter === v} className={`tab ${filter === v ? 'on' : ''}`} onClick={() => setFilter(v)}>{l}</button>)}</div>
        </div>
      </div>
      <div style={{ marginBottom: 18 }}><SampleNote>Sample data. These drives are demo entries, not your college’s uploaded notices. Real company information will come from the backend.</SampleNote></div>
      {list.length === 0 ? <div className="card"><Empty title="No drives match" text="Try a different search or filter." /></div> : (
        <div className="grid g3">
          {list.map((x) => {
            const e = checkEligibility(student, x).eligible, t = timeLeft(x.deadline)
            return (
              <button key={x.id} className="card" style={{ textAlign: 'left' }} onClick={() => setSel(x.id)}>
                <div className="row"><CompanyLogo name={x.company} /><div className="grow"><b style={{ fontSize: 16 }}>{x.company}</b><div className="small muted trunc">{x.role}</div></div><span className={`badge ${e ? 'green' : 'gray'}`}>{e ? 'Eligible' : 'Not eligible'}</span></div>
                <div className="row wrap small muted" style={{ marginTop: 14 }}><span className="row" style={{ gap: 5 }}><Wallet size={14} />{x.ctc} LPA</span><span className="badge violet">Category {x.category}</span><span className="badge gray">{x.type}</span></div>
                <div className="row small" style={{ marginTop: 12, color: t.hours < 48 ? 'var(--red)' : 'var(--ink-2)', fontWeight: 600 }}><AlarmClock size={14} />{t.overdue ? 'Applications closed' : `Apply within ${t.text}`}</div>
              </button>
            )
          })}
        </div>
      )}
      {d && (
        <Drawer title={`${d.company} · ${d.role}`} onClose={() => setSel(null)}>
          <div className="row wrap"><span className="badge violet">Category {d.category}</span><span className="badge">{d.ctc} LPA</span><span className="badge gray">{d.type}</span></div>
          <dl className="kv">
            <dt>Drive date</dt><dd>{shortDate(d.date)}</dd><dt>Apply by</dt><dd>{shortDate(d.deadline)} ({timeLeft(d.deadline).text} {timeLeft(d.deadline).overdue ? 'ago' : 'left'})</dd>
            <dt>Min. CGPA</dt><dd>{d.criteria.minCgpa}</dd><dt>Branches</dt><dd>{d.criteria.branches.join(', ')}</dd><dt>Max. backlogs</dt><dd>{d.criteria.maxBacklogs}</dd><dt>Source notice</dt><dd className="row" style={{ gap: 6 }}><FileText size={14} />{d.notice}</dd>
          </dl>
          <div className={`callout ${r.eligible ? '' : 'bad'}`}>{r.eligible ? <CheckCircle2 size={18} /> : <XCircle size={18} />}<span>{r.eligible ? 'You meet every criterion for this drive.' : `You do not meet: ${r.checks.filter((c) => !c.ok).map((c) => c.label).join(', ')}.`}</span></div>
          <button className="btn primary" onClick={() => nav('/app/assistant', { state: { ask: `What are the rules for sitting in ${d.company}'s drive after getting an offer?` } })}>Ask the assistant about this drive</button>
        </Drawer>
      )}
    </>
  )
}
