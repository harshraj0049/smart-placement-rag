import { ENDPOINTS } from '../config'
import { ApiError, notConfigured, request } from './http'

/**
 * Field names follow rag/ingest.py (DocumentMetadata and IngestResult).
 * The multipart part names and the response keys are still to be confirmed with Sarthak,
 * who owns the FastAPI router. college_id is never sent: the backend derives it from the admin's JWT.
 */
export function buildUploadFormData(v) {
  const fd = new FormData()
  fd.append('file', v.file)
  fd.append('doc_type', v.docType)
  fd.append('batch', v.batch.trim())
  if (v.title.trim()) fd.append('title', v.title.trim())
  if (v.noticeDate) fd.append('notice_date', v.noticeDate) // YYYY-MM-DD
  if (v.docType === 'company_notice') {
    fd.append('company', v.company.trim())
    fd.append('notice_type', v.noticeType)
    if (v.jobRole.trim()) fd.append('job_role', v.jobRole.trim())
  }
  return fd
}

const STATUSES = ['added', 'updated', 'skipped']
const toNumber = (n) => (typeof n === 'number' && Number.isFinite(n) ? n : null)

function parseUploadResponse(p) {
  if (!p || typeof p !== 'object' || typeof p.status !== 'string') {
    throw new ApiError('The server replied, but not in the expected format (missing "status").', { code: 'contract' })
  }
  return {
    status: p.status,
    known: STATUSES.includes(p.status),
    documentId: p.document_id ?? null,
    documentName: p.document_name ?? null,
    chunks: toNumber(p.chunks ?? p.chunk_count), // null when the server did not send a count
  }
}

/** POST multipart/form-data. Resolves to { status, known, documentId, documentName, chunks }. */
export async function uploadDocument(values) {
  if (!ENDPOINTS.documentsUpload) throw notConfigured('Document upload', 'VITE_DOCUMENTS_UPLOAD_PATH')
  const payload = await request(ENDPOINTS.documentsUpload, { method: 'POST', formData: buildUploadFormData(values) })
  return parseUploadResponse(payload)
}

// Epoch seconds (rag metadata "ingested_at") or an ISO string -> ISO string, else null.
function toIso(v) {
  if (v == null || v === '') return null
  const d = typeof v === 'number' ? new Date(v < 1e12 ? v * 1000 : v) : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
function normalizeDocument(d, i) {
  return {
    id: d.document_id ?? d.id ?? `row-${i}`,
    name: d.document_name ?? d.name ?? d.filename ?? 'Untitled document',
    type: d.doc_type ?? d.type ?? null,
    company: d.company_display ?? d.company ?? null,
    batch: d.batch ?? null,
    status: typeof d.status === 'string' ? d.status : null,
    chunks: toNumber(d.chunks ?? d.chunk_count),
    date: toIso(d.ingested_at ?? d.uploaded_at ?? d.created_at),
  }
}

/** GET the college's documents. The backend decides the college from the JWT. */
export async function listDocuments() {
  if (!ENDPOINTS.documentsList) throw notConfigured('The document list', 'VITE_DOCUMENTS_LIST_PATH')
  const payload = await request(ENDPOINTS.documentsList)
  const rows = Array.isArray(payload) ? payload : payload?.items ?? payload?.documents
  if (!Array.isArray(rows)) throw new ApiError('The document list came back in an unexpected format.', { code: 'contract' })
  return rows.map(normalizeDocument)
}
