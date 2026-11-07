import { useState } from 'react'
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Save } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { checkEligibility, categoryOf } from '../../lib/eligibility'
import { CardHead, CompanyLogo, SampleNote } from '../../components/ui'
import { shortDate } from '../../lib/format'

const BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL']

export default function Eligibility() {
  const { student, setStudent, drives, notify } = useApp()
  const [f, setF] = useState({ ...student, currentOfferLpa: student.currentOfferLpa ?? '' })
  const [open, setOpen] = useState(null)
  const num = (v) => (v === '' ? '' : Number(v))
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const live = { ...f, cgpa: Number(f.cgpa) || 0, backlogs: Number(f.backlogs) || 0, examsCleared: Number(f.examsCleared) || 0, year: Number(f.year), currentOfferLpa: f.currentOfferLpa === '' ? null : Number(f.currentOfferLpa) }
  const results = drives.map((d) => ({ d, r: checkEligibility(live, d) }))
  const ok = results.filter((x) => x.r.eligible).length
  const save = () => { setStudent({ ...student, ...live }); notify('Profile saved') }

  return (
    <>
      <div className="page-head"><div><h1>My Eligibility</h1><p>Checked with your profile and each notice's criteria. No guessing involved.</p></div></div>
      <div style={{ marginBottom: 18 }}><SampleNote>Sample data. Eligibility is checked in your browser against demo drives, and your profile stays on this device until the backend supports student profiles.</SampleNote></div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(280px, 340px) 1fr', alignItems: 'start' }}>
        <div className="card stack">
          <CardHead title="Your profile" />
          <div className="field"><label htmlFor="cg">CGPA</label><input id="cg" className="input" type="number" step="0.01" min="0" max="10" value={f.cgpa} onChange={(e) => set('cgpa', e.target.value)} /></div>
          <div className="field"><label htmlFor="br">Branch</label><select id="br" className="select" value={f.branch} onChange={(e) => set('branch', e.target.value)}>{BRANCHES.map((b) => <option key={b}>{b}</option>)}</select></div>
          <div className="grid g2" style={{ gap: 12 }}>
            <div className="field"><label htmlFor="bk">Active backlogs</label><input id="bk" className="input" type="number" min="0" value={f.backlogs} onChange={(e) => set('backlogs', e.target.value)} /></div>
            <div className="field"><label htmlFor="yr">Graduation year</label><input id="yr" className="input" type="number" value={f.year} onChange={(e) => set('year', e.target.value)} /></div>
          </div>
          <div className="field"><label htmlFor="ex">Exit tests cleared (of 3)</label><input id="ex" className="input" type="number" min="0" max="3" value={f.examsCleared} onChange={(e) => set('examsCleared', e.target.value)} /></div>
          <div className="field"><label htmlFor="of">Current offer (LPA), if any</label><input id="of" className="input" type="number" step="0.1" min="0" placeholder="No offer yet" value={f.currentOfferLpa} onChange={(e) => set('currentOfferLpa', num(e.target.value))} />
            {live.currentOfferLpa ? <span className="small muted">Category {categoryOf(live.currentOfferLpa)}. Next offer must beat 1.5× this CTC.</span> : null}</div>
          <button className="btn solid" onClick={save}><Save size={16} />Save profile</button>
        </div>

        <div className="stack">
          <div className="callout"><CheckCircle2 size={18} style={{ flex: 'none' }} /><span>You qualify for <b>{ok} of {drives.length}</b> open drives with these details.</span></div>
          {results.map(({ d, r }) => (
            <div className="card" key={d.id} style={{ padding: 0 }}>
              <button className="row" style={{ width: '100%', padding: 18, textAlign: 'left' }} onClick={() => setOpen(open === d.id ? null : d.id)} aria-expanded={open === d.id}>
                <CompanyLogo name={d.company} />
                <div className="grow"><b>{d.company}</b> <span className="muted">· {d.role}</span><div className="small muted">{d.ctc} LPA · Category {d.category} · Drive on {shortDate(d.date)}</div></div>
                <span className={`badge ${r.eligible ? 'green' : 'red'}`}>{r.eligible ? <CheckCircle2 size={13} /> : <XCircle size={13} />}{r.eligible ? 'Eligible' : 'Not eligible'}</span>
                {open === d.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {open === d.id && (
                <div style={{ padding: '0 18px 16px 76px' }}>
                  {r.checks.map((c) => (
                    <div className="check" key={c.label}>
                      <span className={`ci ${c.ok ? 'ok' : 'no'}`}>{c.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}</span>
                      <b style={{ width: 130 }}>{c.label}</b><span className="muted">Needs {c.need}</span><span className="grow" style={{ textAlign: 'right', fontWeight: 600, color: c.ok ? 'var(--green)' : 'var(--red)' }}>You: {c.have}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
