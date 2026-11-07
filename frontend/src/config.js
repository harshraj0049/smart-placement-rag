// Central place for everything that depends on the backend being wired up.
// All values come from Vite env vars (see .env.example), so Sarthak's real paths
// can be dropped in without touching components.
const env = import.meta.env
const text = (v) => (typeof v === 'string' ? v.trim() : '')
const flag = (v) => text(v).toLowerCase() === 'true'

// Base URL for every API call. "/api" is proxied to the FastAPI server by vite.config.js.
export const API_BASE_URL = (text(env.VITE_API_BASE_URL) || '/api').replace(/\/+$/, '')

// Paths are relative to API_BASE_URL. An empty string means "not available yet":
// the UI then shows an honest "not connected" state instead of calling the server.
export const ENDPOINTS = {
  login: text(env.VITE_AUTH_LOGIN_PATH),                                   // UNCONFIRMED: ask Sarthak
  documentsUpload: text(env.VITE_DOCUMENTS_UPLOAD_PATH) || '/documents',   // POST multipart/form-data (team discussion)
  documentsList: text(env.VITE_DOCUMENTS_LIST_PATH),                       // GET: not ready yet
  chat: text(env.VITE_CHAT_PATH) || '/query',                              // UNCONFIRMED: inherited from the earlier README
  conversations: text(env.VITE_CONVERSATIONS_PATH),                        // GET list: only if the backend supports history
  conversation: text(env.VITE_CONVERSATION_PATH),                          // GET one, use {id} as placeholder, e.g. /conversations/{id}
}

export const FEATURES = {
  // Dev-only shortcut that skips login. Ignored in production builds.
  devLogin: Boolean(env.DEV) && flag(env.VITE_DEV_LOGIN),
  // Pages outside the immediate MVP (tickets, answer review, analytics, platform console...).
  // They still run on demo data, so they stay hidden unless this is switched on.
  futurePages: flag(env.VITE_ENABLE_FUTURE_PAGES),
}

// Mirrors rag/ingest.py (MAX_PDF_BYTES and the pydantic field limits).
export const LIMITS = { maxPdfBytes: 20 * 1024 * 1024, titleMax: 120, companyMax: 100, jobRoleMax: 100 }
