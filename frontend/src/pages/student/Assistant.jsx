import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { History, Lightbulb, Loader2, AlertCircle, Info } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useConversations } from '../../hooks/useConversations'
import { getConversation } from '../../api/chat'
import ChatPanel from '../../components/ChatPanel'
import { ago } from '../../lib/format'

export default function Assistant() {
  const { state } = useLocation()
  const nav = useNavigate()
  const { setMessages, setConversationId } = useApp()
  const { status, items, error } = useConversations()
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)

  // Clear router state after reading it so a refresh does not re-send the question.
  const ask = state?.ask
  const openId = state?.conversationId
  useEffect(() => { if (ask || openId) window.history.replaceState({}, '') }, [ask, openId])

  // Opening a past chat from Chat History.
  useEffect(() => {
    if (!openId) return undefined
    let live = true
    setLoading(true); setLoadError('')
    getConversation(openId)
      .then((msgs) => { if (live) { setMessages(msgs); setConversationId(openId) } })
      .catch((e) => { if (live) setLoadError(e.message || 'Could not open this chat.') })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [openId]) // eslint-disable-line

  return (
    <>
      <div className="page-head"><div><h1>AI Placement Assistant</h1><p>Ask about your college’s placement rules, notices and deadlines.</p></div></div>
      {loading && <div className="row muted" role="status" style={{ marginBottom: 12 }}><Loader2 size={16} className="spin" />Opening chat…</div>}
      {loadError && <div className="callout bad" role="alert" style={{ marginBottom: 12 }}><AlertCircle size={18} style={{ flex: 'none' }} /><span>{loadError}</span></div>}
      <div className="chat-layout">
        <ChatPanel key={ask || 'chat'} initialQuestion={ask} />
        <aside className="side-chat">
          <div className="card">
            <div className="card-head"><h3 className="card-title"><History size={17} color="var(--blue)" />Recent chats</h3></div>
            {status === 'loading' && <div className="row small muted"><Loader2 size={14} className="spin" />Loading…</div>}
            {status === 'unavailable' && <p className="small muted row" style={{ alignItems: 'flex-start' }}><Info size={15} style={{ flex: 'none', marginTop: 2 }} />Chat history is not available yet.</p>}
            {status === 'error' && <p className="small" style={{ color: 'var(--red)' }}>{error}</p>}
            {status === 'ready' && items.length === 0 && <p className="small muted">No earlier chats yet.</p>}
            {status === 'ready' && items.slice(0, 4).map((h) => (
              <button key={h.id} className="hist" onClick={() => nav('/app/assistant', { state: { conversationId: h.id } })}>
                <div className="trunc strong" style={{ fontSize: 13 }}>{h.title}</div>{h.when && <div className="small faint">{ago(h.when)}</div>}
              </button>
            ))}
          </div>
          <div className="callout"><Lightbulb size={18} style={{ flex: 'none' }} /><span>Name the company and your batch in your question. It helps the assistant find the right notice.</span></div>
        </aside>
      </div>
    </>
  )
}
