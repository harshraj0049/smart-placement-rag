import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Upload, FileText, Loader2, Library, AlertCircle, RefreshCw, Info } from 'lucide-react'
import { useDocuments } from '../../hooks/useDocuments'
import { docTypeLabel } from '../../lib/validators'
import { shortDate } from '../../lib/format'
import { Empty, Modal } from '../../components/ui'
import DocumentUploadForm from '../../components/DocumentUploadForm'

const STATUS_TONE = { indexed: 'green', processing: 'amber', failed: 'red' }
const OUTCOME_LABEL = { added: ['Added', 'green'], updated: ['Replaced', 'green'], skipped: ['Skipped', 'gray'] }

export default function Knowledge() {
  const { state } = useLocation()
  const { status, items, error, reload } = useDocuments()
  const [open, setOpen] = useState(!!state?.upload)
  const [busy, setBusy] = useState(false)
  const [session, setSession] = useState([]) // uploads confirmed by the backend during this visit

  const close = () => { if (!busy) setOpen(false) } // never close mid-upload

  // Only real server responses end up here: nothing is guessed or simulated.
  const onUploaded = (r, sent) => {
    setSession((rows) => [{
      id: `${Date.now()}`, name: r.documentName || sent.file.name, type: sent.docType, batch: sent.batch.trim(),
      company: sent.docType === 'company_notice' ? sent.company.trim() : null, status: r.status, chunks: r.chunks, date: new Date().toISOString(),
    }, ...rows])
    if (status === 'ready' || status === 'error') reload()
  }

  return (
    <>
      <div className="page-head">
        <div><h1>Knowledge base</h1><p>Upload your college’s placement documents. Students get answers only from what your college uploads.</p></div>
        <button className="btn primary" onClick={() => setOpen(true)}><Upload size={16} />Upload document</button>
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 12 }}><Library size={18} color="var(--blue)" />Uploaded documents</h3>
        {status === 'loading' && <div className="row muted" role="status"><Loader2 size={18} className="spin" />Loading documents…</div>}
        {status === 'unavailable' && (
          <div className="callout"><Info size={18} style={{ flex: 'none' }} /><span>The list of uploaded documents is not connected yet. It will appear here when the backend list endpoint is ready{session.length ? '. Documents you upload now are shown below.' : '.'}</span></div>
        )}
        {status === 'error' && (
          <div className="callout bad" role="alert"><AlertCircle size={18} style={{ flex: 'none' }} /><span className="grow">{error}</span><button className="link" onClick={reload}><RefreshCw size={13} />Try again</button></div>
        )}
        {status === 'ready' && items.length === 0 && (
          <Empty icon={Library} title="No documents yet" text="Upload the T&P rules first, then company notices as they arrive."><button className="btn primary" onClick={() => setOpen(true)}>Upload document</button></Empty>
        )}
        {status === 'ready' && items.length > 0 && (
          <div className="table-wrap"><table>
            <thead><tr><th>Document</th><th>Type</th><th>Company</th><th>Batch</th><th>Status</th><th>Chunks</th><th>Uploaded</th></tr></thead>
            <tbody>{items.map((d) => (
              <tr key={d.id}>
                <td><div className="row"><FileText size={18} color="var(--blue)" /><b className="trunc" style={{ maxWidth: 260 }}>{d.name}</b></div></td>
                <td><span className="badge violet">{docTypeLabel(d.type)}</span></td>
                <td>{d.company || '—'}</td><td>{d.batch || '—'}</td>
                <td>{d.status ? <span className={`badge ${STATUS_TONE[d.status] || 'gray'}`}>{d.status}</span> : '—'}</td>
                <td>{d.chunks ?? '—'}</td><td>{d.date ? shortDate(d.date) : '—'}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>

      {status !== 'ready' && session.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <h3 className="card-title" style={{ marginBottom: 4 }}>Uploaded in this session</h3>
          <p className="small muted" style={{ marginBottom: 8 }}>Taken from the server’s upload responses. This list is cleared when you leave the page.</p>
          <div className="table-wrap"><table>
            <thead><tr><th>Document</th><th>Type</th><th>Company</th><th>Batch</th><th>Result</th><th>Chunks</th><th>Time</th></tr></thead>
            <tbody>{session.map((d) => {
              const [label, tone] = OUTCOME_LABEL[d.status] || [d.status, 'gray']
              return (
                <tr key={d.id}>
                  <td><div className="row"><FileText size={18} color="var(--blue)" /><b className="trunc" style={{ maxWidth: 260 }}>{d.name}</b></div></td>
                  <td><span className="badge violet">{docTypeLabel(d.type)}</span></td><td>{d.company || '—'}</td><td>{d.batch}</td>
                  <td><span className={`badge ${tone}`}>{label}</span></td><td>{d.chunks ?? '—'}</td>
                  <td>{new Date(d.date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</td>
                </tr>
              )
            })}</tbody>
          </table></div>
        </div>
      )}

      {open && (
        <Modal title="Upload document" onClose={close}>
          <DocumentUploadForm onUploaded={onUploaded} onDone={close} onBusyChange={setBusy} />
        </Modal>
      )}
    </>
  )
}
