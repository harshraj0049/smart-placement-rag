import { ENDPOINTS } from '../config'
import { ApiError, notConfigured, request } from './http'

/**
 * ⚠ UNCONFIRMED CONTRACT: to be agreed with Sarthak (router) and Harsh (what the RAG layer can return).
 * rag/query.py currently returns plain text only, so sources and a conversation id need a backend wrapper.
 * Nothing here implements RAG; the frontend only sends the question and renders what comes back.
 * college_id is never sent: the backend must take it from the student's JWT.
 */
const buildRequest = ({ question, conversationId }) => ({
  question,
  ...(conversationId ? { conversation_id: conversationId } : {}),
})

const toSource = (s) => (typeof s === 'string' ? { doc: s, page: null } : { doc: s?.doc ?? s?.document_name ?? s?.source ?? null, page: s?.page ?? s?.page_number ?? null })

function parseAnswer(p) {
  const text = typeof p === 'string' ? p : p?.answer ?? p?.text ?? p?.response
  if (typeof text !== 'string' || !text.trim()) {
    throw new ApiError('The assistant replied, but not in the expected format (no answer text).', { code: 'contract' })
  }
  return {
    text,
    sources: Array.isArray(p?.sources) ? p.sources.map(toSource).filter((s) => s.doc) : [],
    conversationId: p?.conversation_id ?? null,
    confidence: typeof p?.confidence === 'number' ? p.confidence : null,
  }
}

/** Resolves to { text, sources: [{doc, page}], conversationId, confidence } */
export async function askAssistant({ question, conversationId, signal }) {
  if (!ENDPOINTS.chat) throw notConfigured('The assistant', 'VITE_CHAT_PATH')
  const payload = await request(ENDPOINTS.chat, { method: 'POST', json: buildRequest({ question, conversationId }), signal })
  return parseAnswer(payload)
}

// ---- Conversation history: only used when the backend supports it (paths empty = unsupported) ----
const rowsOf = (p, key) => (Array.isArray(p) ? p : p?.[key])

export async function listConversations() {
  if (!ENDPOINTS.conversations) throw notConfigured('Chat history', 'VITE_CONVERSATIONS_PATH')
  const rows = rowsOf(await request(ENDPOINTS.conversations), 'conversations')
  if (!Array.isArray(rows)) throw new ApiError('The chat history came back in an unexpected format.', { code: 'contract' })
  return rows.map((c, i) => ({
    id: c.id ?? c.conversation_id ?? `c${i}`,
    title: c.title ?? c.first_question ?? 'Conversation',
    when: c.updated_at ?? c.created_at ?? null,
  }))
}

/** Resolves to the messages of one past conversation, in chat-panel shape. */
export async function getConversation(id) {
  if (!ENDPOINTS.conversation) throw notConfigured('Opening past chats', 'VITE_CONVERSATION_PATH')
  const payload = await request(ENDPOINTS.conversation.replace('{id}', encodeURIComponent(id)))
  const rows = rowsOf(payload, 'messages')
  if (!Array.isArray(rows)) throw new ApiError('The conversation came back in an unexpected format.', { code: 'contract' })
  return rows.map((m, i) => ({
    id: `h${id}-${i}`,
    role: m.role === 'user' ? 'user' : 'bot',
    text: m.content ?? m.text ?? '',
    sources: Array.isArray(m.sources) ? m.sources.map(toSource).filter((s) => s.doc) : [],
  }))
}
