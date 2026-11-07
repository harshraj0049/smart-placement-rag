import { useRef, useState } from 'react'
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2, MinusCircle, X } from 'lucide-react'
import { LIMITS } from '../config'
import { DOC_TYPES, NOTICE_TYPES, formatBytes, validateUpload } from '../lib/validators'
import { uploadDocument } from '../api/documents'

const EMPTY = { file: null, docType: '', batch: '', title: '', noticeDate: '', company: '', noticeType: '', jobRole: '' }
const ALL_TOUCHED = { file: true, docType: true, batch: true, title: true, noticeDate: true, company: true, noticeType: true, jobRole: true }

// What the admin sees for each status the backend can return.
const OUTCOME = {
  added: { tone: 'green', Icon: CheckCircle2, title: 'Uploaded successfully', text: 'The document is now part of your college’s knowledge base.' },
  updated: { tone: 'green', Icon: CheckCircle2, title: 'Existing notice replaced', text: 'The earlier version was replaced. Students get answers from the new one.' },
  skipped: { tone: 'amber', Icon: MinusCircle, title: 'Already uploaded', text: 'This exact file is already in the knowledge base, so nothing changed.' },
}

function FieldError({ id, children }) {
  return children ? <span id={id} className="field-error" role="alert">{children}</span> : null
}

export default function DocumentUploadForm({ onUploaded, onDone, onBusyChange }) {
  const [values, setValues] = useState(EMPTY)
  const [touched, setTouched] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [result, setResult] = useState(null)
  const [over, setOver] = useState(false)
  const inflight = useRef(false) // blocks a second submit in the same tick, before React re-renders
  const fileInput = useRef(null)
  const formRef = useRef(null)

  const errors = validateUpload(values)
  const err = (k) => (touched[k] ? errors[k] : undefined)
  const isNotice = values.docType === 'company_notice'

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }))
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }))
  const field = (k) => ({ id: `up-${k}`, 'aria-invalid': !!err(k), 'aria-describedby': err(k) ? `up-${k}-err` : undefined, onBlur: blur(k) })

  const pickFile = (file) => {
    if (submitting) return
    setValues((v) => ({ ...v, file: file || null }))
    setTouched((t) => ({ ...t, file: true }))
    setServerError('')
  }

  const reset = () => { setValues(EMPTY); setTouched({}); setServerError(''); setResult(null) }

  const submit = async (e) => {
    e.preventDefault()
    if (inflight.current) return
    setTouched(ALL_TOUCHED)
    if (Object.keys(errors).length) {
      formRef.current?.querySelector('[aria-invalid="true"], .dropzone.invalid')?.focus?.()
      return
    }
    inflight.current = true
    setSubmitting(true); onBusyChange?.(true); setServerError('')
    const sent = { ...values }
    try {
      const r = await uploadDocument(sent)
      setResult({ ...r, fileName: sent.file.name })
      onUploaded?.(r, sent)
    } catch (ex) {
      setServerError(ex.message || 'The upload failed. Try again.')
    } finally {
      inflight.current = false
      setSubmitting(false); onBusyChange?.(false)
    }
  }

  if (result) {
    const o = OUTCOME[result.status] || { tone: 'amber', Icon: AlertCircle, title: `Server replied “${result.status}”`, text: 'This status is not one the app recognises. Check with the backend team.' }
    return (
      <div className="stack" aria-live="polite">
        <div className={`callout ${o.tone === 'green' ? 'ok' : 'warn'}`} style={{ alignItems: 'flex-start' }}>
          <o.Icon size={22} style={{ flex: 'none' }} />
          <div><b>{o.title}</b><p style={{ marginTop: 2 }}>{o.text}</p></div>
        </div>
        <dl className="kv">
          <dt>Document</dt><dd>{result.documentName || result.fileName}</dd>
          <dt>Chunks indexed</dt><dd>{result.chunks != null ? result.chunks : 'Not returned by the server'}</dd>
        </dl>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={reset}>Upload another</button>
          <button className="btn primary" onClick={onDone}>Done</button>
        </div>
      </div>
    )
  }

  const f = values.file
  return (
    <form ref={formRef} onSubmit={submit} noValidate className="stack" style={{ gap: 16 }}>
      <fieldset disabled={submitting} className="plain stack" style={{ gap: 16 }}>
        <div className="field">
          <label htmlFor="up-file">PDF file <span className="req">*</span></label>
          <div
            className={`dropzone ${over ? 'over' : ''} ${err('file') ? 'invalid' : ''}`} role="button" tabIndex={0}
            aria-describedby={err('file') ? 'up-file-err' : undefined}
            onClick={() => !submitting && fileInput.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), !submitting && fileInput.current?.click())}
            onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); pickFile(e.dataTransfer.files[0]) }}
          >
            {f ? (
              <div className="row" style={{ justifyContent: 'center' }}>
                <FileText size={22} color="var(--blue)" />
                <div style={{ textAlign: 'left', minWidth: 0 }}><b className="trunc" style={{ display: 'block', maxWidth: 300 }}>{f.name}</b><span className="small faint">{formatBytes(f.size)}</span></div>
                <button type="button" className="icon-btn" aria-label="Remove file" onClick={(e) => { e.stopPropagation(); pickFile(null); if (fileInput.current) fileInput.current.value = '' }}><X size={16} /></button>
              </div>
            ) : (
              <><Upload size={28} color="var(--blue)" /><p style={{ marginTop: 6 }}><b>Drop a PDF</b> or click to browse</p><p className="small faint">PDF only, up to {formatBytes(LIMITS.maxPdfBytes)}</p></>
            )}
            <input id="up-file" ref={fileInput} type="file" accept=".pdf,application/pdf" hidden onChange={(e) => pickFile(e.target.files[0])} />
          </div>
          <FieldError id="up-file-err">{err('file')}</FieldError>
        </div>

        <div className="grid g2" style={{ gap: 12 }}>
          <div className="field">
            <label htmlFor="up-docType">Document type <span className="req">*</span></label>
            <select className="select" value={values.docType} onChange={set('docType')} {...field('docType')}>
              <option value="">Select a type</option>
              {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <FieldError id="up-docType-err">{err('docType')}</FieldError>
          </div>
          <div className="field">
            <label htmlFor="up-batch">Batch <span className="req">*</span></label>
            <input className="input" inputMode="numeric" maxLength={4} placeholder="2027" value={values.batch} onChange={(e) => setValues((v) => ({ ...v, batch: e.target.value.replace(/\D/g, '') }))} {...field('batch')} />
            <FieldError id="up-batch-err">{err('batch')}</FieldError>
          </div>
        </div>

        {isNotice && (
          <div className="stack notice-box" style={{ gap: 12 }}>
            <div className="grid g2" style={{ gap: 12 }}>
              <div className="field">
                <label htmlFor="up-company">Company name <span className="req">*</span></label>
                <input className="input" placeholder="e.g. Infosys" value={values.company} onChange={set('company')} {...field('company')} />
                <FieldError id="up-company-err">{err('company')}</FieldError>
              </div>
              <div className="field">
                <label htmlFor="up-noticeType">Notice type <span className="req">*</span></label>
                <select className="select" value={values.noticeType} onChange={set('noticeType')} {...field('noticeType')}>
                  <option value="">Select a notice type</option>
                  {NOTICE_TYPES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
                </select>
                <FieldError id="up-noticeType-err">{err('noticeType')}</FieldError>
              </div>
            </div>
            <div className="field">
              <label htmlFor="up-jobRole">Job role <span className="faint">(optional)</span></label>
              <input className="input" placeholder="e.g. Systems Engineer" value={values.jobRole} onChange={set('jobRole')} {...field('jobRole')} />
              <FieldError id="up-jobRole-err">{err('jobRole')}</FieldError>
            </div>
          </div>
        )}

        <div className="grid g2" style={{ gap: 12 }}>
          <div className="field">
            <label htmlFor="up-title">Title <span className="faint">(optional)</span></label>
            <input className="input" maxLength={LIMITS.titleMax + 20} placeholder="Shown instead of the file name" value={values.title} onChange={set('title')} {...field('title')} />
            <FieldError id="up-title-err">{err('title')}</FieldError>
          </div>
          <div className="field">
            <label htmlFor="up-noticeDate">Notice date <span className="faint">(optional)</span></label>
            <input className="input" type="date" value={values.noticeDate} onChange={set('noticeDate')} {...field('noticeDate')} />
            <FieldError id="up-noticeDate-err">{err('noticeDate')}</FieldError>
          </div>
        </div>
      </fieldset>

      {serverError && <div className="callout bad" role="alert"><AlertCircle size={18} style={{ flex: 'none' }} /><span>{serverError}</span></div>}
      {submitting && <p className="small muted" role="status">Uploading and indexing. Large PDFs can take a while, so keep this window open.</p>}

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn ghost" onClick={onDone} disabled={submitting}>Cancel</button>
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? <><Loader2 size={16} className="spin" />Uploading…</> : <><Upload size={16} />Upload document</>}
        </button>
      </div>
    </form>
  )
}
