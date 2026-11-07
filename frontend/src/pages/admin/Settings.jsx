import { useState } from 'react'
import { Save } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { SEVERITY, SLA_HOURS } from '../../data/seed'
import { Switch } from '../../components/ui'

export default function AdminSettings() {
  const { notify } = useApp()
  const [cfg, setCfg] = useState({ name: 'KIIT University', cell: 'Training & Placement Cell', color: '#2d5bff', hours: ['09:00', '18:00'], threshold: 0.55, auto: true, merge: true, sla: { ...SLA_HOURS } })
  const [saved, setSaved] = useState(cfg)
  const dirty = JSON.stringify(cfg) !== JSON.stringify(saved)
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }))
  const save = () => { setSaved(cfg); notify('Settings saved for KIIT University') }

  return (
    <>
      <div className="page-head"><div><h1>Settings</h1><p>These apply to your college only.</p></div><button className="btn primary" onClick={save} disabled={!dirty}><Save size={16} />Save changes</button></div>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card stack">
          <h3 className="card-title">Branding</h3>
          <div className="field"><label htmlFor="cn">College name</label><input id="cn" className="input" value={cfg.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div className="field"><label htmlFor="cl">Placement cell name</label><input id="cl" className="input" value={cfg.cell} onChange={(e) => set('cell', e.target.value)} /></div>
          <div className="field"><label htmlFor="cc">Accent colour</label><div className="row"><input id="cc" type="color" value={cfg.color} onChange={(e) => set('color', e.target.value)} style={{ width: 48, height: 40, border: 0, background: 'none' }} /><code>{cfg.color}</code></div></div>
          <div className="field"><label>Working hours</label><div className="row"><input aria-label="Start" className="input" type="time" value={cfg.hours[0]} onChange={(e) => set('hours', [e.target.value, cfg.hours[1]])} /><span>to</span><input aria-label="End" className="input" type="time" value={cfg.hours[1]} onChange={(e) => set('hours', [cfg.hours[0], e.target.value])} /></div><span className="small muted">Reply times pause outside these hours, except for Critical tickets.</span></div>
        </div>
        <div className="card stack">
          <h3 className="card-title">Escalation rules</h3>
          <div className="field"><label htmlFor="th">Escalate when confidence is below {Math.round(cfg.threshold * 100)}%</label><input id="th" type="range" min="0.2" max="0.9" step="0.05" value={cfg.threshold} onChange={(e) => set('threshold', Number(e.target.value))} /><span className="small muted">Higher means more tickets for staff and fewer risky answers.</span></div>
          <div className="row"><div className="grow"><b>Merge near-duplicate tickets</b><div className="small muted">Staff answer once for everyone who asked.</div></div><Switch on={cfg.merge} onChange={(v) => set('merge', v)} label="Merge duplicate tickets" /></div>
          <div className="row"><div className="grow"><b>Auto-assign by workload</b><div className="small muted">Category, availability and open tickets decide the assignee.</div></div><Switch on={cfg.auto} onChange={(v) => set('auto', v)} label="Auto-assign" /></div>
          <div className="field"><label>Reply time promised to students (hours)</label>
            <div className="grid g4" style={{ gap: 10 }}>{SEVERITY.map((s) => <div className="field" key={s}><span className="small muted">{s}</span><input aria-label={`${s} hours`} className="input" type="number" min="1" value={cfg.sla[s]} onChange={(e) => set('sla', { ...cfg.sla, [s]: Number(e.target.value) })} /></div>)}</div></div>
        </div>
      </div>
    </>
  )
}
