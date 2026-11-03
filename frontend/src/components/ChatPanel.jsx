import { useEffect, useRef, useState } from 'react'
import { Bot, FileText, Send, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Paperclip, LifeBuoy, CheckCircle2, Plus, Minimize2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { askAssistant } from '../api/client'
import { RichText, SeverityBadge } from './ui'
import { SUGGESTIONS } from '../data/seed'
import { useNavigate } from 'react-router-dom'

let seq = 0
const uid = () => `m${Date.now()}-${seq++}`

function Sources({ sources }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      {sources.map((s, i) => (
        <button key={i} className="cite" onClick={() => setOpen(!open)} aria-expanded={open} title="Show where this came from">
          <FileText size={14} />{s.doc} · Page {s.page}{i === 0 && (open ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
        </button>
      ))}
      {open && <div className="excerpt">Answer is grounded in the cited pages of the indexed document. Open the Placement Guidelines page to read the full section.</div>}
    </div>
  )
}

function Escalation({ ticket }) {
  const nav = useNavigate()
  return (
    <div className="esc done">
      <div className="row" style={{ gap: 8, fontWeight: 700 }}><CheckCircle2 size={18} color="var(--green)" />
        {ticket.duplicate ? 'Already with the T&P cell. Yours was added to the same ticket.' : 'Sent to the T&P cell. You will be notified when staff reply.'}
      </div>
      <div className="row wrap" style={{ marginTop: 10 }}>
        <span className="badge gray">{ticket.id}</span><SeverityBadge value={ticket.severity} />
        <span className="badge violet">{ticket.complexity}</span><span className="badge">{ticket.category}</span>
      </div>
      <p className="small muted" style={{ marginTop: 8 }}>Expected response within {ticket.eta} hours. Track it under My Questions.</p>
      <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => nav('/app/tickets')}>View my questions</button>
    </div>
  )
}

function Message({ m, onFeedback }) {
  if (m.role === 'user') return <div className="msg user"><div className="bubble">{m.text}</div></div>
  const r = m.result
  return (
    <div className="msg bot">
      <div className="mini-bot"><Bot size={18} /></div>
      <div className="bubble">
        {m.error ? <p>Something went wrong reaching the assistant. Check your connection and try again.</p> : r?.type === 'answer' ? (
          <>
            <RichText text={r.text} />
            <Sources sources={r.sources} />
            <div className="conf" style={{ color: r.confidence > .8 ? 'var(--green)' : 'var(--amber)' }}>
              <CheckCircle2 size={14} />Checked against sources · {Math.round(r.confidence * 100)}% confidence
            </div>
            <div className="msg-foot">Was this answer helpful?
              <button className="icon-btn" style={{ width: 28, height: 28, color: m.feedback === 'up' ? 'var(--blue)' : undefined }} aria-label="Helpful" onClick={() => onFeedback(m.id, 'up')}><ThumbsUp size={15} /></button>
              <button className="icon-btn" style={{ width: 28, height: 28, color: m.feedback === 'down' ? 'var(--red)' : undefined }} aria-label="Not helpful" onClick={() => onFeedback(m.id, 'down')}><ThumbsDown size={15} /></button>
            </div>
          </>
        ) : (
          <>
            <p><b>I can't answer this reliably from the indexed documents.</b></p>
            <p className="muted">{r?.reason} Instead of guessing, I raised it with the T&amp;P cell.</p>
            {m.ticket && <Escalation ticket={m.ticket} />}
          </>
        )}
      </div>
    </div>
  )
}

export default function ChatPanel({ docked = false, initialQuestion, onMinimize }) {
  const { messages, setMessages, addTicket, student, startNewChat, notify, user } = useApp()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)
  const sentInitial = useRef(false)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, busy])

  const send = async (q) => {
    const question = (q ?? text).trim()
    if (!question || busy) return
    setText('')
    setMessages((m) => [...m, { id: uid(), role: 'user', text: question }])
    setBusy(true)
    try {
      const result = await askAssistant(question, { collegeId: 'kiit' })
      let ticket
      if (result.type === 'escalate') {
        ticket = addTicket({ student: student.name, branch: student.branch, question, severity: result.severity, complexity: result.complexity, category: result.category, reason: result.reason, confidence: result.confidence })
        ticket = { ...ticket, eta: result.eta_hours }
      }
      setMessages((m) => [...m, { id: uid(), role: 'bot', result, ticket }])
    } catch {
      setMessages((m) => [...m, { id: uid(), role: 'bot', error: true }])
    } finally { setBusy(false) }
  }

  useEffect(() => {
    if (initialQuestion && !sentInitial.current) { sentInitial.current = true; send(initialQuestion) }
  }, []) // eslint-disable-line

  const feedback = (id, v) => { setMessages((all) => all.map((m) => (m.id === id ? { ...m, feedback: v } : m))); notify('Thanks, your feedback was saved') }
  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <section className="chat-panel" aria-label="Placement assistant chat">
      <div className="chat-head">
        <div className="bot"><Bot size={24} /></div>
        <div className="grow"><b style={{ fontSize: 17 }}>PlaceMate AI<span className="online">Online</span></b><div className="small" style={{ color: '#b8c6f0' }}>Your smart placement policy assistant</div></div>
        <button className="icon-btn" style={{ color: '#fff' }} onClick={startNewChat} aria-label="Start a new chat" title="New chat"><Plus size={18} /></button>
        {onMinimize && <button className="icon-btn" style={{ color: '#fff' }} onClick={onMinimize} aria-label="Minimize"><Minimize2 size={18} /></button>}
      </div>
      <div className="chat-body" aria-live="polite">
        {messages.length === 0 && (
          <div className="empty" style={{ margin: 'auto' }}>
            <div className="ei"><LifeBuoy size={26} /></div>
            <b style={{ color: 'var(--ink)', fontSize: 16 }}>Ask about placement rules, {user.name.split(' ')[0]}</b>
            <p style={{ maxWidth: 380 }}>Every answer cites the notice or policy page it came from. If I am not sure, your question goes to the T&amp;P cell.</p>
          </div>
        )}
        {messages.map((m) => <Message key={m.id} m={m} onFeedback={feedback} />)}
        {busy && <div className="msg bot"><div className="mini-bot"><Bot size={18} /></div><div className="bubble"><span className="typing" aria-label="Assistant is typing"><i /><i /><i /></span></div></div>}
        <div ref={endRef} />
      </div>
      {messages.length === 0 && (
        <div className="chips">{SUGGESTIONS.slice(0, docked ? 3 : 4).map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}</div>
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
