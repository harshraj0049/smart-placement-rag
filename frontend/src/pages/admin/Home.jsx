import { useNavigate } from 'react-router-dom'
import { Library, Building2, Users, Upload, FileText, ScrollText, HelpCircle, BarChart3 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useDocuments } from '../../hooks/useDocuments'
import { firstName } from '../../auth/roles'
import { CardHead, Empty, Stat } from '../../components/ui'

const TYPES = [
  [ScrollText, 'T&P Rules', 'The placement regulations for a batch. Upload one per batch.', '#e6edff', '#2d5bff'],
  [Building2, 'Company Notice', 'Registration, job description, eligibility, PPT or schedule notices from a company.', '#fff0dd', '#ea7a0c'],
  [HelpCircle, 'Placement FAQ', 'Answers to questions students ask again and again.', '#e7f7ee', '#12a150'],
]

export default function AdminHome() {
  const { user } = useApp()
  const nav = useNavigate()
  const { status, items } = useDocuments()
  const ready = status === 'ready'
  const first = firstName(user)

  return (
    <>
      <div className="page-head"><div><h1>Dashboard</h1><p>Welcome{first ? `, ${first}` : ''}. Manage the documents your students’ assistant answers from.</p></div></div>
      <div className="grid g3">
        <Stat tinted tone="blue" icon={Library} label="Uploaded documents" value={ready ? items.length : '—'} />
        <Stat tinted tone="orange" icon={Building2} label="Company notices" value={ready ? items.filter((d) => d.type === 'company_notice').length : '—'} />
        <Stat tinted tone="purple" icon={Users} label="Students" value="—" />
      </div>
      {!ready && <p className="small faint" style={{ marginTop: 8 }}>A dash means the backend has not provided that number yet.</p>}

      <div className="card" style={{ margin: '18px 0' }}>
        <CardHead title="Quick actions"><span className="small muted">Common tasks</span></CardHead>
        <div className="quick" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <button onClick={() => nav('/admin/knowledge', { state: { upload: true } })}><span className="qi" style={{ background: '#e6edff', color: '#2d5bff' }}><Upload size={22} /></span><b>Upload document</b><span>PDF rules, notices, FAQs</span></button>
          <button onClick={() => nav('/admin/knowledge')}><span className="qi" style={{ background: '#e7f7ee', color: '#12a150' }}><FileText size={22} /></span><b>View documents</b><span>See what is indexed</span></button>
        </div>
      </div>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card">
          <CardHead title="What you can upload" icon={Library} />
          {TYPES.map(([I, t, s, bg, c]) => (
            <div className="li" key={t} style={{ alignItems: 'flex-start' }}>
              <span className="qi" style={{ background: bg, color: c, width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', flex: 'none' }}><I size={20} /></span>
              <div className="grow"><b>{t}</b><p className="small muted">{s}</p></div>
            </div>
          ))}
        </div>
        <div className="card">
          <CardHead title="Student statistics" icon={BarChart3} tone="#5b4bff" />
          <Empty icon={BarChart3} title="Not available yet" text="College-level student numbers will show here once the backend provides them." />
        </div>
      </div>
    </>
  )
}
