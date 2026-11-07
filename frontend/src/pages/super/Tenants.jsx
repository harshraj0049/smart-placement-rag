import { useState } from 'react'
import { Plus, Building2, Users, FileText, ShieldCheck } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { shortDate } from '../../lib/format'
import { Modal, Stat } from '../../components/ui'

export default function Tenants() {
  const { tenants, addTenant, notify } = useApp()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', slug: '', admin: '' })
  const slugTaken = tenants.some((t) => t.id === f.slug)
  const valid = f.name.trim() && /^[a-z0-9-]{3,}$/.test(f.slug) && /^\S+@\S+\.\S+$/.test(f.admin) && !slugTaken
  const create = () => { addTenant({ id: f.slug, name: f.name.trim(), students: 0, docs: 0, tickets: 0, status: 'onboarding', plan: 'Trial', leaks: 0, created: new Date().toISOString() }); notify(`${f.name} created. Invite sent to ${f.admin}`); setOpen(false); setF({ name: '', slug: '', admin: '' }) }

  return (
    <>
      <div className="page-head"><div><h1>Colleges</h1><p>Each college is an independent tenant with its own documents, users and tickets.</p></div><button className="btn primary" onClick={() => setOpen(true)}><Plus size={16} />Add college</button></div>
      <div className="grid g4">
        <Stat tinted tone="blue" icon={Building2} label="Colleges" value={tenants.length} />
        <Stat tinted tone="green" icon={Users} label="Students" value={tenants.reduce((a, t) => a + t.students, 0)} />
        <Stat tinted tone="purple" icon={FileText} label="Documents" value={tenants.reduce((a, t) => a + t.docs, 0)} />
        <Stat tinted tone="orange" icon={ShieldCheck} label="Data leaks found" value={tenants.reduce((a, t) => a + t.leaks, 0)} />
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <div className="table-wrap"><table>
          <thead><tr><th>College</th><th>Tenant ID</th><th>Students</th><th>Documents</th><th>Tickets</th><th>Plan</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>{tenants.map((t) => <tr key={t.id}><td><b>{t.name}</b></td><td><code>{t.id}</code></td><td>{t.students}</td><td>{t.docs}</td><td>{t.tickets}</td><td>{t.plan}</td><td><span className={`badge ${t.status === 'live' ? 'green' : 'amber'}`}>{t.status === 'live' ? 'Live' : 'Onboarding'}</span></td><td>{shortDate(t.created)}</td></tr>)}</tbody>
        </table></div>
      </div>
      {open && (
        <Modal title="Add college" onClose={() => setOpen(false)}>
          <div className="field"><label htmlFor="tn">College name</label><input id="tn" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: f.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) })} /></div>
          <div className="field"><label htmlFor="ts">Tenant ID</label><input id="ts" className="input" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} aria-invalid={slugTaken} />
            <span className="small" style={{ color: slugTaken ? 'var(--red)' : 'var(--ink-3)' }}>{slugTaken ? 'This ID is already used.' : 'Lowercase letters, numbers and hyphens. Used to separate this college’s data and cannot be changed later.'}</span></div>
          <div className="field"><label htmlFor="ta">First TnP admin email</label><input id="ta" className="input" type="email" value={f.admin} onChange={(e) => setF({ ...f, admin: e.target.value })} /></div>
          <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn primary" disabled={!valid} onClick={create}>Create college</button></div>
        </Modal>
      )}
    </>
  )
}
