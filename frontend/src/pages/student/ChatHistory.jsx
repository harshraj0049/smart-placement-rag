import { useNavigate } from 'react-router-dom'
import { MessageSquareText } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { ago } from '../../lib/format'
import { Empty } from '../../components/ui'

export default function ChatHistory() {
  const { history } = useApp()
  const nav = useNavigate()
  return (
    <>
      <div className="page-head"><div><h1>Chat History</h1><p>Open a past question to ask it again with the latest documents.</p></div></div>
      <div className="card">
        {history.length === 0 ? <Empty icon={MessageSquareText} title="No chats yet" text="Your conversations will appear here." /> : history.map((h) => (
          <button className="li hist" key={h.id} style={{ borderRadius: 0 }} onClick={() => nav('/app/assistant', { state: { ask: h.title } })}>
            <MessageSquareText size={18} color="var(--blue)" /><span className="grow strong">{h.title}</span><span className="small faint">{ago(h.when)}</span>
          </button>
        ))}
      </div>
    </>
  )
}
