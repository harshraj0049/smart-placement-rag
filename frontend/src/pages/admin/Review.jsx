import { useState } from 'react'
import { Check, X, Pencil, ClipboardCheck, BookOpenCheck } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { Empty } from '../../components/ui'

export default function Review() {
  const { tickets, updateTicket, notify } = useApp()
  const [edit, setEdit] = useState(null)
  const [text, setText] = useState('')
  const pending = tickets.filter((t) => t.status === 'resolved' && t.reusable && !t.reviewed)
  const added = tickets.filter((t) => t.reusable && t.reviewed && t.addedToKb)

  const approve = (t, answer) => { updateTicket(t.id, { reviewed: true, addedToKb: true, answer }); setEdit(null); notify('Added to the knowledge base. The assistant will use it from now on') }
  const reject = (t) => { updateTicket(t.id, { reviewed: true, reusable: false }); notify('Kept as a one-off answer') }

  return (
    <>
      <div className="page-head"><div><h1>Answer review</h1><p>Staff replies marked reusable. Approve them so the same question never needs a human twice.</p></div></div>
      {pending.length === 0 ? <div className="card"><Empty icon={ClipboardCheck} title="Nothing to review" text="Reusable replies will appear here after staff answer a ticket." /></div> : (
        <div className="stack">{pending.map((t) => (
          <div className="card" key={t.id}>
            <div className="row wrap between"><div className="row"><b>{t.id}</b><span className="badge">{t.category}</span><span className="badge gray">{t.merged} students asked</span></div><span className="small faint">Answered by {t.assignee}</span></div>
            <p className="small faint" style={{ marginTop: 12 }}>Question</p><p style={{ fontWeight: 600 }}>{t.question}</p>
            <p className="small faint" style={{ marginTop: 12 }}>Answer to add</p>
            {edit === t.id ? <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} aria-label="Edit answer" /> : <p>{t.answer}</p>}
            <div className="row" style={{ marginTop: 16 }}>
              {edit === t.id ? <><button className="btn solid sm" onClick={() => approve(t, text)} disabled={!text.trim()}><Check size={15} />Save and add</button><button className="btn ghost sm" onClick={() => setEdit(null)}>Cancel</button></>
                : <><button className="btn solid sm" onClick={() => approve(t, t.answer)}><Check size={15} />Add to knowledge base</button><button className="btn ghost sm" onClick={() => { setEdit(t.id); setText(t.answer) }}><Pencil size={14} />Edit first</button><button className="btn danger sm" onClick={() => reject(t)}><X size={15} />Keep as one-off</button></>}
            </div>
          </div>))}</div>
      )}
      {added.length > 0 && <div className="card" style={{ marginTop: 18 }}><h3 className="card-title" style={{ marginBottom: 8 }}><BookOpenCheck size={18} color="var(--green)" />Added from staff replies</h3>{added.map((t) => <div className="li" key={t.id}><div className="grow"><div className="strong">{t.question}</div><div className="small muted">{t.answer}</div></div><span className="badge green">Live</span></div>)}</div>}
    </>
  )
}
