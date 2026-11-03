import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Upload, FileText, Trash2, Loader2, CheckCircle2, Copy, GitCompareArrows, Mail, ClipboardPaste, Library } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { shortDate } from '../../lib/format'
import { Empty, Modal } from '../../components/ui'

const TYPES = ['Policy', 'Company notice', 'Shortlist', 'FAQ', 'Announcement']

export default function Knowledge() {
  const { docs, addDoc, updateDoc, removeDoc, notify, user } = useApp()
  const { state } = useLocation()
  const [open, setOpen] = useState(!!state?.upload)
  const [mode, setMode] = useState('file')
  const [file, setFile] = useState(null)
  const [pasted, setPasted] = useState('')
  const [type, setType] = useState('Company notice')
  const [company, setCompany] = useState('')
  const [over, setOver] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const inp = useRef(null)

  // Simulates the ingestion pipeline: parse -> chunk -> enrich -> embed -> index.
  useEffect(() => {
    const pending = docs.filter((d) => d.status === 'processing')
    const timers = pending.map((d) => setTimeout(() => updateDoc(d.id, { status: 'indexed', chunks: 8 + Math.floor(Math.random() * 20) }), 2500))
    return () => timers.forEach(clearTimeout)
  }, [docs]) // eslint-disable-line

  const name = mode === 'file' ? file?.name : `Pasted text – ${new Date().toLocaleDateString('en-IN')}.txt`
  const duplicate = name && docs.some((d) => d.name.toLowerCase() === name.toLowerCase())
  const older = type === 'Company notice' && company.trim() && docs.find((d) => d.company.toLowerCase() === company.trim().toLowerCase())
  const valid = (mode === 'file' ? !!file : pasted.trim().length > 20) && !duplicate

  const reset = () => { setOpen(false); setFile(null); setPasted(''); setCompany(''); setType('Company notice') }
  const submit = () => {
    addDoc({ id: `k${Date.now()}`, name, type, company: company.trim() || '—', pages: mode === 'file' ? Math.max(1, Math.round(file.size / 40000)) : 1, chunks: 0, status: 'processing', date: new Date().toISOString(), by: user.name, version: older ? 'v2' : 'v1', supersedes: older ? older.name : null })
    notify(older ? 'Uploaded. The older notice will be marked superseded' : 'Uploaded. Indexing has started')
    reset()
  }

  return (
    <>
      <div className="page-head"><div><h1>Knowledge base</h1><p>Everything the assistant is allowed to answer from. Only your college sees these.</p></div>
        <div className="row"><button className="btn ghost" onClick={() => notify('Forwarding address: kiit@ingest.placemate.ai')}><Mail size={16} />Forward by email</button><button className="btn primary" onClick={() => setOpen(true)}><Upload size={16} />Upload document</button></div></div>
      <div className="card">
        {docs.length === 0 ? <Empty icon={Library} title="No documents yet" text="Upload the placement regulations first, then company notices as they arrive."><button className="btn primary" onClick={() => setOpen(true)}>Upload document</button></Empty> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Document</th><th>Type</th><th>Company</th><th>Chunks</th><th>Added</th><th>Status</th><th><span className="sr">Actions</span></th></tr></thead>
            <tbody>{docs.map((d) => {
              const superseded = docs.some((x) => x.supersedes === d.name)
              return (
                <tr key={d.id} style={superseded ? { opacity: .6 } : null}>
                  <td><div className="row"><FileText size={18} color="var(--blue)" /><div><b className="trunc" style={{ display: 'block', maxWidth: 260 }}>{d.name}</b><span className="small faint">{d.pages} {d.pages === 1 ? 'page' : 'pages'} · {d.version} · {d.by}</span>{d.supersedes && <div className="small" style={{ color: 'var(--amber)', fontWeight: 600 }}><GitCompareArrows size={12} style={{ verticalAlign: -2 }} /> Replaces {d.supersedes}</div>}</div></div></td>
                  <td><span className="badge violet">{d.type}</span></td><td>{d.company}</td><td>{d.status === 'indexed' ? d.chunks : '—'}</td><td>{shortDate(d.date)}</td>
                  <td>{superseded ? <span className="badge gray">Superseded</span> : d.status === 'indexed' ? <span className="badge green"><CheckCircle2 size={13} />Indexed</span> : <span className="badge amber"><Loader2 size={13} className="spin" />Indexing</span>}</td>
                  <td><button className="icon-btn" aria-label={`Delete ${d.name}`} onClick={() => setConfirmDel(d)}><Trash2 size={17} /></button></td>
                </tr>)
            })}</tbody></table></div>
        )}
      </div>

      {open && (
        <Modal title="Upload document" onClose={reset}>
          <div className="tabs" style={{ alignSelf: 'flex-start' }}><button className={`tab ${mode === 'file' ? 'on' : ''}`} onClick={() => setMode('file')}><Upload size={13} style={{ verticalAlign: -2 }} /> File</button><button className={`tab ${mode === 'text' ? 'on' : ''}`} onClick={() => setMode('text')}><ClipboardPaste size={13} style={{ verticalAlign: -2 }} /> Paste text</button></div>
          {mode === 'file' ? (
            <div className={`dropzone ${over ? 'over' : ''}`} onClick={() => inp.current?.click()} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); setFile(e.dataTransfer.files[0] || null) }} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && inp.current?.click()}>
              <Upload size={28} color="var(--blue)" /><p style={{ marginTop: 6 }}>{file ? <b>{file.name}</b> : <><b>Drop a file</b> or click to browse</>}</p><p className="small faint">PDF, DOCX or TXT</p>
              <input ref={inp} type="file" accept=".pdf,.docx,.txt" hidden onChange={(e) => setFile(e.target.files[0] || null)} />
            </div>
          ) : <div className="field"><label htmlFor="pt">Notice text</label><textarea id="pt" className="textarea" rows={6} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Paste the notice or announcement here." /></div>}
          <div className="grid g2" style={{ gap: 12 }}>
            <div className="field"><label htmlFor="ty">Document type</label><select id="ty" className="select" value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="field"><label htmlFor="co">Company</label><input id="co" className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Optional, e.g. Adobe" /></div>
          </div>
          {duplicate && <div className="callout bad"><Copy size={18} style={{ flex: 'none' }} /><span>A document with this name is already indexed. Rename it or delete the old one so it is not indexed twice.</span></div>}
          {older && !duplicate && <div className="callout warn"><GitCompareArrows size={18} style={{ flex: 'none' }} /><span>There is already a notice for {older.company}. The new one will replace <b>{older.name}</b> and answers will use the newer deadline.</span></div>}
          <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn ghost" onClick={reset}>Cancel</button><button className="btn primary" onClick={submit} disabled={!valid}>Upload and index</button></div>
        </Modal>
      )}
      {confirmDel && (
        <Modal title="Delete this document?" onClose={() => setConfirmDel(null)}>
          <p className="muted"><b>{confirmDel.name}</b> and its {confirmDel.chunks} chunks will be removed from search. Answers that cited it will stop working.</p>
          <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn ghost" onClick={() => setConfirmDel(null)}>Keep document</button><button className="btn danger" onClick={() => { removeDoc(confirmDel.id); notify('Document deleted'); setConfirmDel(null) }}>Delete document</button></div>
        </Modal>
      )}
    </>
  )
}
