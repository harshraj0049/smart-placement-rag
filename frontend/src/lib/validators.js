import { LIMITS } from '../config'

export const DOC_TYPES = [
  { value: 'tnp_rules', label: 'T&P Rules' },
  { value: 'company_notice', label: 'Company Notice' },
  { value: 'placement_faq', label: 'Placement FAQ' },
]
export const NOTICE_TYPES = [
  { value: 'registration', label: 'Registration' },
  { value: 'job_description', label: 'Job description' },
  { value: 'eligibility', label: 'Eligibility' },
  { value: 'ppt', label: 'Pre-placement talk (PPT)' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'update', label: 'Update' },
  { value: 'general', label: 'General' },
]
export const docTypeLabel = (v) => DOC_TYPES.find((d) => d.value === v)?.label || v || '—'
export const noticeTypeLabel = (v) => NOTICE_TYPES.find((d) => d.value === v)?.label || v || '—'

export function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function validateFile(file) {
  if (!file) return 'Choose a PDF file to upload.'
  const looksPdf = /\.pdf$/i.test(file.name) && ['', 'application/pdf', 'application/x-pdf'].includes(file.type)
  if (!looksPdf) return 'Only PDF files are accepted.'
  if (file.size === 0) return 'This file is empty.'
  if (file.size > LIMITS.maxPdfBytes) return `This file is ${formatBytes(file.size)}. The limit is ${formatBytes(LIMITS.maxPdfBytes)}.`
  return null
}

const isRealDate = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

/** Returns an object of { fieldName: message }. Empty object means the form is valid. */
export function validateUpload(v) {
  const e = {}
  const fileError = validateFile(v.file)
  if (fileError) e.file = fileError

  if (!DOC_TYPES.some((d) => d.value === v.docType)) e.docType = 'Select a document type.'

  const batch = v.batch.trim()
  if (!batch) e.batch = 'Enter the graduating batch.'
  else if (!/^\d{4}$/.test(batch)) e.batch = 'Batch must be four digits, for example 2027.'

  if (v.title.trim().length > LIMITS.titleMax) e.title = `Title can be at most ${LIMITS.titleMax} characters.`
  if (v.noticeDate && !isRealDate(v.noticeDate)) e.noticeDate = 'Enter a valid date.'

  if (v.docType === 'company_notice') {
    const company = v.company.trim()
    if (!company) e.company = 'Enter the company name.'
    else if (company.length > LIMITS.companyMax) e.company = `Company name can be at most ${LIMITS.companyMax} characters.`
    if (!NOTICE_TYPES.some((n) => n.value === v.noticeType)) e.noticeType = 'Select a notice type.'
    if (v.jobRole.trim().length > LIMITS.jobRoleMax) e.jobRole = `Job role can be at most ${LIMITS.jobRoleMax} characters.`
  }
  return e
}
