import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Lightbulb } from 'lucide-react'
import ChatPanel from '../../components/ChatPanel'

export default function Assistant() {
  const { state } = useLocation()
  const ask = state?.ask
  useEffect(() => { if (ask) window.history.replaceState({}, '') }, [ask])

  return (
    <>
      <div className="page-head"><div><h1>AI Placement Assistant</h1><p>Ask about your college’s placement rules, notices and deadlines.</p></div></div>
      <div className="chat-layout">
        <ChatPanel key={ask || 'chat'} initialQuestion={ask} />
        <aside className="side-chat">
          <div className="card">
            <div className="card-head"><h3 className="card-title">Conversation context</h3></div>
            <p className="small muted">Follow-ups use up to the last five exchanges in this session. Chats are not saved; refreshing or starting a new chat clears the context.</p>
          </div>
          <div className="callout"><Lightbulb size={18} style={{ flex: 'none' }} /><span>Name the company and your batch in your question. It helps the assistant find the right notice.</span></div>
        </aside>
      </div>
    </>
  )
}
