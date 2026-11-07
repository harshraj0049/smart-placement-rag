import { useEffect, useRef, useState } from 'react'
import { Bot, FileText, Send, CheckCircle2, Plus, Minimize2, LifeBuoy, Paperclip, AlertCircle, RotateCcw } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { askAssistant } from '../api/chat'
import { firstName } from '../auth/roles'
import { RichText } from './ui'
import { SUGGESTIONS } from '../data/seed'

let seq = 0
const uid = () => `m${Date.now()}-${seq++}`

function Sources({ sources }) {
  if (!sources?.length) return null
  return (
    <div>
      {sources.map((s, i) => (
        <span key={i} className="cite" style={{ cursor: 'default' }}><FileText size={14} />{s.doc}{s.page != null ? ` · Page ${s.page}` : ''}</span>
      ))}
    </div>
  )
}

function Message({ m, busy, onRetry }) {
  if (m.role === 'user') return <div className="msg user"><div className="bubble">{m.text}</div></div>
  return (
    <div className="msg bot">
      <div className="mini-bot"><Bot size={18} /></div>
      <div className="bubble">
        {m.error ? (
          <div className="chat-error" role="alert">
            <p className="row" style={{ gap: 8, fontWeight: 700 }}><AlertCircle size={16} />Could not get an answer</p>
            <p style={{ marginTop: 4 }}>{m.error}</p>
            <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => onRetry(m)} disabled={busy}><RotateCcw size={14} />Try again</button>
          </div>
        ) : (
          <>
            <RichText text={m.text} />
            <Sources sources={m.sources} />
            {typeof m.confidence === 'number' && (
              <div className="conf" style={{ color: m.confidence > 0.8 ? 'var(--green)' : 'var(--amber)' }}><CheckCircle2 size={14} />{Math.round(m.confidence * 100)}% confidence</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function ChatPanel({ docked = false, initialQuestion, onMinimize }) {
  const { messages, setMessages, conversationId, setConversationId, chatBusy: busy, setChatBusy, startNewChat, user } = useApp()
  const [text, setText] = useState('')
  const endRef = useRef(null)
  const sentInitial = useRef(false)
  const sending = useRef(false) // guards against a second send before React re-renders

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, busy])

  // `retryOf` is the id of a failed answer: it is replaced, and the student's question is not added twice.
  const send = async (q, retryOf) => {
    const question = (q ?? text).trim()
    if (!question || sending.current) return
    sending.current = true
    setChatBusy(true)
    if (retryOf) setMessages((all) => all.filter((x) => x.id !== retryOf))
    else { setText(''); setMessages((all) => [...all, { id: uid(), role: 'user', text: question }]) }
    try {
      const r = await askAssistant({ question, conversationId })
      if (r.conversationId) setConversationId(r.conversationId)
      setMessages((all) => [...all, { id: uid(), role: 'bot', text: r.text, sources: r.sources, confidence: r.confidence }])
    } catch (err) {
      setMessages((all) => [...all, { id: uid(), role: 'bot', error: err.message || 'Something went wrong. Try again.', question }])
    } finally {
      sending.current = false
      setChatBusy(false)
    }
  }

  useEffect(() => {
    if (initialQuestion && !sentInitial.current) { sentInitial.current = true; send(initialQuestion) }
  }, []) // eslint-disable-line

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }
  const name = firstName(user)

  return (
    <section className="chat-panel" aria-label="Placement assistant chat">
      <div className="chat-head">
        <div className="bot"><Bot size={24} /></div>
        <div className="grow"><b style={{ fontSize: 17 }}>PlaceMate AI</b><div className="small" style={{ color: '#b8c6f0' }}>Answers from your college’s placement documents</div></div>
        <button className="icon-btn" style={{ color: '#fff' }} onClick={startNewChat} disabled={busy} aria-label="Start a new chat" title="New chat"><Plus size={18} /></button>
        {onMinimize && <button className="icon-btn" style={{ color: '#fff' }} onClick={onMinimize} aria-label="Minimize"><Minimize2 size={18} /></button>}
      </div>
      <div className="chat-body" aria-live="polite">
        {messages.length === 0 && (
          <div className="empty" style={{ margin: 'auto' }}>
            <div className="ei"><LifeBuoy size={26} /></div>
            <b style={{ color: 'var(--ink)', fontSize: 16 }}>Ask about placement rules{name ? `, ${name}` : ''}</b>
            <p style={{ maxWidth: 380 }}>Ask about eligibility, deadlines or rules for your batch. You can ask follow-up questions in the same chat.</p>
          </div>
        )}
        {messages.map((m) => <Message key={m.id} m={m} busy={busy} onRetry={(failed) => send(failed.question, failed.id)} />)}
        {busy && <div className="msg bot"><div className="mini-bot"><Bot size={18} /></div><div className="bubble"><span className="typing" role="status" aria-label="The assistant is answering"><i /><i /><i /></span></div></div>}
        <div ref={endRef} />
      </div>
      {messages.length === 0 && (
        <div className="chips">{SUGGESTIONS.slice(0, docked ? 3 : 4).map((s) => <button key={s} className="chip" onClick={() => send(s)} disabled={busy}>{s}</button>)}</div>
      )}
      <div className="composer">
        <div className="box">
          <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} placeholder="Ask a placement question…" aria-label="Your question" />
          <button className="send" onClick={() => send()} disabled={!text.trim() || busy} aria-label="Send"><Send size={17} /></button>
        </div>
        <div className="small faint row" style={{ marginTop: 8 }}><Paperclip size={13} />Answers come from your college's uploaded documents only.</div>
      </div>
    </section>
  )
}
