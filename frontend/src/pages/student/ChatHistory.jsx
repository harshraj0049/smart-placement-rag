import { useNavigate } from 'react-router-dom'
import { MessageSquareText, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useConversations } from '../../hooks/useConversations'
import { ago } from '../../lib/format'
import { Empty } from '../../components/ui'

export default function ChatHistory() {
  const { status, items, error, reload } = useConversations()
  const nav = useNavigate()
  return (
    <>
      <div className="page-head"><div><h1>Chat History</h1><p>Open an earlier conversation to continue it.</p></div></div>
      <div className="card">
        {status === 'loading' && <div className="row muted" role="status"><Loader2 size={18} className="spin" />Loading your chats…</div>}
        {status === 'unavailable' && <Empty icon={MessageSquareText} title="Chat history is not available yet" text="Your conversations will be listed here once the backend supports saving them." />}
        {status === 'error' && <div className="callout bad" role="alert"><AlertCircle size={18} style={{ flex: 'none' }} /><span className="grow">{error}</span><button className="link" onClick={reload}><RefreshCw size={13} />Try again</button></div>}
        {status === 'ready' && items.length === 0 && <Empty icon={MessageSquareText} title="No chats yet" text="Your conversations will appear here." />}
        {status === 'ready' && items.map((h) => (
          <button className="li hist" key={h.id} style={{ borderRadius: 0 }} onClick={() => nav('/app/assistant', { state: { conversationId: h.id } })}>
            <MessageSquareText size={18} color="var(--blue)" /><span className="grow strong">{h.title}</span>{h.when && <span className="small faint">{ago(h.when)}</span>}
          </button>
        ))}
      </div>
    </>
  )
}
