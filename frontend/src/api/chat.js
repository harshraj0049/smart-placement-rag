import { ENDPOINTS } from '../config'
import { ApiError, notConfigured, request } from './http'

/** Stateless chat request. The client sends at most five completed exchanges as context. */
const buildRequest = ({ question, history }) => ({
  question,
  history,
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
    confidence: typeof p?.confidence === 'number' ? p.confidence : null,
  }
}

/** Resolves to { text, sources: [{doc, page}], confidence }. */
export async function askAssistant({ question, history = [], signal }) {
  if (!ENDPOINTS.chat) throw notConfigured('The assistant', 'VITE_CHAT_PATH')
  const payload = await request(ENDPOINTS.chat, { method: 'POST', json: buildRequest({ question, history }), signal })
  return parseAnswer(payload)
}
