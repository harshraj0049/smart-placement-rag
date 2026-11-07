import { FileText, Download, Megaphone } from 'lucide-react'
import { ago } from '../../lib/format'
import { UPDATES } from '../../data/seed'
import { CardHead, SampleNote } from '../../components/ui'

const SECTIONS = [
  ['Eligibility to participate', 'Attendance of 75% in theory and 100% in practicals; all 3 exit tests by Kareer School.', 'Page 2'],
  ['Placement categories', 'Category 1: 3–7 LPA. Category 2: above 7 up to 14 LPA. Category 3: above 14 LPA.', 'Page 3'],
  ['Offers and upgrades', 'Maximum of three offers. A higher category needs more than 1.5× the current CTC.', 'Page 3–4'],
  ['Discipline', 'Absence after registering, skipping rounds and contacting companies directly lead to action.', 'Page 4'],
  ['After selection', 'Offers cannot be rejected. Sign-off form and medical fitness certificate are mandatory.', 'Page 5'],
  ['Off-campus offers', 'Inform placement@kiit.ac.in with the offer letter before joining.', 'Page 5'],
]

export default function Guidelines() {
  return (
    <>
      <div className="page-head"><div><h1>Placement Guidelines</h1><p>A static summary of one sample regulation document.</p></div></div>
      <div style={{ marginBottom: 18 }}><SampleNote>Sample content, not your college’s uploaded documents.</SampleNote></div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', alignItems: 'start' }}>
        <div className="card">
          <CardHead icon={FileText} title="T&P Regulations, 2027 batch" />
          {SECTIONS.map(([t, s, p]) => <div className="li" key={t} style={{ alignItems: 'flex-start' }}><div className="grow"><b>{t}</b><p className="muted" style={{ marginTop: 2 }}>{s}</p></div><span className="badge">{p}</span></div>)}
          <p className="small faint" style={{ marginTop: 14 }}>This is a summary. The PDF is the official source.</p>
        </div>
        <div className="stack">
          <div className="card">
            <CardHead icon={Megaphone} title="Recent changes" tone="#e5484d" />
            {UPDATES.map((u) => <div className="li" key={u.id}><i className={`dot ${u.tone === 'blue' ? '' : u.tone}`} /><div className="grow" style={{ fontWeight: 600, fontSize: 13 }}>{u.text}<div className="small faint" style={{ fontWeight: 400 }}>{ago(u.when)}</div></div></div>)}
          </div>
        </div>
      </div>
    </>
  )
}
