import { useState } from 'react'
import { CheckCircle2, Loader2, Play, ShieldCheck } from 'lucide-react'
import { useApp } from '../../context/AppContext'

const TESTS = [
  ['Vector search with another tenant’s namespace', 'Vector store'], ['Ticket list requested with a foreign tenant ID', 'Database'],
  ['Document download using another college’s file key', 'File storage'], ['Cached answer reused across tenants', 'Cache'],
  ['JWT with a tampered tenant claim', 'Auth middleware'], ['Student opening a TnP admin route', 'Roles'],
  ['Prompt injection asking for another college’s data', 'Agent'],
]
export default function Isolation() {
  const { notify } = useApp()
  const [state, setState] = useState(null)
  const run = () => {
    setState({ done: 0 })
    TESTS.forEach((_, i) => setTimeout(() => { setState({ done: i + 1 }); if (i === TESTS.length - 1) notify('All isolation tests passed. 0 leaks') }, 500 * (i + 1)))
  }
  const done = state?.done ?? 0
  return (
    <>
      <div className="page-head"><div><h1>Isolation tests</h1><p>Automated attempts to read one college’s data from another. The target is zero leaks.</p></div><button className="btn primary" onClick={run} disabled={state && done < TESTS.length}><Play size={16} />Run all tests</button></div>
      <div className="callout"><ShieldCheck size={18} style={{ flex: 'none' }} /><span>This page shows the results format. Connect it to the backend test runner to show live results.</span></div>
      <div className="card" style={{ marginTop: 18 }}>
        {TESTS.map(([t, layer], i) => (
          <div className="li" key={t}>
            {state && i < done ? <CheckCircle2 size={20} color="var(--green)" /> : state ? <Loader2 size={20} className="spin" color="var(--blue)" /> : <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--line)' }} />}
            <div className="grow"><b>{t}</b></div><span className="badge gray">{layer}</span><span className={`badge ${state && i < done ? 'green' : 'gray'}`}>{state && i < done ? 'Blocked, 0 leaks' : 'Not run'}</span>
          </div>
        ))}
      </div>
    </>
  )
}
