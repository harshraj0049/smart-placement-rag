import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Switch, Avatar } from '../../components/ui'

export default function StudentSettings() {
  const { user, student, notify, resetDemo } = useApp()
  const [n, setN] = useState({ deadlines: true, notices: true, replies: true })
  const rows = [['deadlines', 'Deadline reminders', 'An alert before applications close'], ['notices', 'New notices that match my profile', 'Only drives you are eligible for'], ['replies', 'Replies from the T&P cell', 'When staff answer one of your questions']]
  return (
    <>
      <div className="page-head"><div><h1>Profile &amp; Settings</h1><p>We keep only the profile fields needed to check eligibility.</p></div></div>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card stack">
          <div className="row"><Avatar name={user.name} size={56} /><div><b style={{ fontSize: 18 }}>{user.name}</b><div className="muted">{user.email}</div></div></div>
          <dl className="kv"><dt>Roll number</dt><dd>{student.roll}</dd><dt>Branch</dt><dd>B.Tech {student.branch}</dd><dt>Batch</dt><dd>{student.year}</dd><dt>CGPA</dt><dd>{student.cgpa}</dd><dt>College</dt><dd>KIIT University</dd></dl>
          <p className="small faint">Edit academic details under My Eligibility.</p>
        </div>
        <div className="card stack">
          <h3 className="card-title">Notifications</h3>
          {rows.map(([k, t, s]) => <div className="row" key={k}><div className="grow"><b>{t}</b><div className="small muted">{s}</div></div><Switch on={n[k]} label={t} onChange={(v) => { setN({ ...n, [k]: v }); notify(v ? 'Reminder turned on' : 'Reminder turned off') }} /></div>)}
          <hr style={{ border: 0, borderTop: '1px solid var(--line)', width: '100%' }} />
          <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={resetDemo}>Reset demo data</button>
        </div>
      </div>
    </>
  )
}
