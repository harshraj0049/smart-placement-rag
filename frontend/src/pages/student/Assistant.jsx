import { useLocation, useNavigate } from 'react-router-dom'
import { Clock, History, Lightbulb } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import ChatPanel from '../../components/ChatPanel'
import { ago } from '../../lib/format'

export default function Assistant() {
  const { state } = useLocation()
  const nav = useNavigate()
  const { history, tickets, student } = useApp()
  const pending = tickets.filter((t) => t.student === student.name && t.status !== 'resolved')

  // Clear router state after reading it so a refresh does not re-send the question.
  const ask = state?.ask
  if (ask) window.history.replaceState({}, '')

  return (
    <>
      <div className="page-head"><div><h1>AI Placement Assistant</h1><p>Answers come with citations. Unclear questions go to the T&amp;P cell.</p></div></div>
      <div className="chat-layout">
        <ChatPanel key={ask || 'chat'} initialQuestion={ask} />
        <aside className="side-chat">
          <div className="card">
            <div className="card-head"><h3 className="card-title"><History size={17} color="var(--blue)" />Recent chats</h3></div>
            {history.slice(0, 4).map((h) => (
              <button key={h.id} className="hist" onClick={() => nav('/app/assistant', { state: { ask: h.title } })}>
                <div className="trunc strong" style={{ fontSize: 13 }}>{h.title}</div><div className="small faint">{ago(h.when)}</div>
              </button>
            ))}
          </div>
          <div className="card">
            <div className="card-head"><h3 className="card-title"><Clock size={17} color="var(--amber)" />Waiting on T&amp;P</h3></div>
            {pending.length === 0 ? <p className="small muted">Nothing pending.</p> : pending.map((t) => <div key={t.id} className="small" style={{ padding: '6px 0' }}><b>{t.id}</b> · {t.severity}<div className="muted trunc">{t.question}</div></div>)}
          </div>
          <div className="callout"><Lightbulb size={18} style={{ flex: 'none' }} /><span>Include your offer CTC and company type in your question. The category rules depend on both.</span></div>
        </aside>
      </div>
    </>
  )
}
