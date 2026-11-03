import { KB_ANSWERS, SLA_HOURS } from '../data/seed'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Backend contract (to be implemented in FastAPI):
 *   POST /api/query  { question, college_id }
 *   -> { type: 'answer',   text, sources: [{doc, page}], confidence }
 *   or { type: 'escalate', reason, severity, complexity, category, confidence, eta_hours }
 * Every request must carry the JWT and the tenant (college_id) so the server can isolate data.
 */
export async function askAssistant(question, { collegeId = 'kiit', token } = {}) {
  if (!USE_MOCK) {
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ question, college_id: collegeId }),
    })
    if (!res.ok) throw new Error(`Assistant request failed (${res.status})`)
    return res.json()
  }
  await wait(900 + Math.random() * 600)
  return mockAnswer(question)
}

const has = (q, words) => words.some((w) => q.includes(w))

function mockAnswer(question) {
  const q = question.toLowerCase()
  const hit = KB_ANSWERS.find((a) => a.keys.every((k) => q.includes(k)))
  if (hit) return { type: 'answer', text: hit.text, sources: hit.sources, confidence: hit.confidence }

  // No reliable evidence: classify the query and escalate instead of guessing.
  let severity = 'Normal'
  if (has(q, ['tonight', 'tomorrow', 'today', 'clash', 'urgent', 'deadline'])) severity = 'Critical'
  else if (has(q, ['switch', 'appeal', 'exception', 'offer', 'joining'])) severity = 'High'
  else if (has(q, ['dress', 'what is', 'average', 'highest'])) severity = 'Low'

  let complexity = 'Clarification'
  if (has(q, ['exception', 'appeal', 'special', 'permission', 'reschedul', 'different slot'])) complexity = 'Needs authority approval'
  else if (has(q, ['dual', 'apply', 'switch', 'can i', 'allowed'])) complexity = 'Policy interpretation'

  let category = 'Process'
  if (has(q, ['cgpa', 'eligib', 'ctc', 'lpa', 'backlog'])) category = 'Eligibility'
  else if (has(q, ['certificate', 'document', 'letter'])) category = 'Documents'
  else if (has(q, ['complain', 'unfair', 'grievance', 'harass'])) category = 'Grievance'

  return {
    type: 'escalate',
    reason: 'The indexed regulations and notices do not cover this question reliably.',
    severity, complexity, category, confidence: 0.2 + Math.random() * 0.15, eta_hours: SLA_HOURS[severity],
  }
}
