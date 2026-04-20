import { useEffect, useState } from 'react'
import { Upload, Trash2, Send, HardDrive, X } from 'lucide-react'
import Header from '../components/Header'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const S = {
  th: { padding: '0.5rem 1rem', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', background: 'rgba(10,17,32,0.5)', borderBottom: '1px solid var(--border)' },
  td: { padding: '0.625rem 1rem', fontSize: '0.78rem', borderBottom: '1px solid rgba(26,42,66,0.4)', color: 'var(--text-secondary)' },
}

const MODELS = ['GRP2602P', 'GRP2604P', 'GRP2614', 'GRP2616', 'GXV3350', 'GXV3380', 'GXV3480']

function fmtBytes(b) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

const Label = ({ children }) => <p style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{children}</p>
const TinyBtn = ({ children, onClick }) => <button onClick={onClick} style={{ fontSize: '0.68rem', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>{children}</button>

export default function Firmware() {
  const { isAdmin } = useAuth()
  const [files, setFiles] = useState([])
  const [devices, setDevices] = useState([])
  const [selected, setSelected] = useState(null)
  const [pushDevices, setPushDevices] = useState([])
  const [pushProtocol, setPushProtocol] = useState('http')
  const [pushing, setPushing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({ version: '', model_target: 'GRP2602P', file: null })

  const fetchAll = async () => {
    const [fRes, dRes] = await Promise.all([api.get('/firmware'), api.get('/devices')])
    setFiles(fRes.data); setDevices(dRes.data)
  }
  useEffect(() => { fetchAll() }, [])

  const uploadFirmware = async (e) => {
    e.preventDefault()
    if (!uploadForm.file) { toast.error('Select a file'); return }
    setUploading(true)
    const fd = new FormData()
    fd.append('file', uploadForm.file); fd.append('version', uploadForm.version); fd.append('model_target', uploadForm.model_target)
    try { await api.post('/firmware/upload', fd); toast.success('Firmware uploaded'); setUploadForm({ version: '', model_target: 'GRP2602P', file: null }); fetchAll() }
    catch (err) { toast.error(err.response?.data?.detail || 'Upload failed') } finally { setUploading(false) }
  }

  const deleteFirmware = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return
    await api.delete(`/firmware/${id}`); toast.success('Deleted')
    if (selected?.id === id) setSelected(null); fetchAll()
  }

  const pushFirmware = async () => {
    if (!selected) { toast.error('Select a firmware file first'); return }
    if (!pushDevices.length) { toast.error('Select at least one device'); return }
    setPushing(true)
    try {
      const r = await api.post('/firmware/push', { firmware_id: selected.id, device_ids: pushDevices.map(Number), protocol: pushProtocol })
      toast.success(`Push sent to ${r.data.results.filter(x => x.success).length}/${r.data.results.length} devices`)
    } catch { toast.error('Push failed') } finally { setPushing(false) }
  }

  const toggleDevice = id => setPushDevices(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  return (
    <div style={{ flex: 1 }}>
      <Header title="Firmware" subtitle="Upload and push firmware updates" />
      <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Upload form */}
        {isAdmin && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Upload style={{ width: '14px', height: '14px', color: '#60a5fa' }} />
              <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>Upload Firmware</p>
            </div>
            <form onSubmit={uploadFirmware} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div>
                <Label>Firmware File</Label>
                <input type="file" accept=".bin,.tar,.gz" onChange={e => setUploadForm(f => ({ ...f, file: e.target.files[0] }))}
                  style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} />
              </div>
              <div>
                <Label>Version</Label>
                <input value={uploadForm.version} onChange={e => setUploadForm(f => ({ ...f, version: e.target.value }))} placeholder="1.0.7.97"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem 0.625rem', fontSize: '0.78rem', color: 'var(--text-primary)', width: '120px' }} />
              </div>
              <div>
                <Label>Target Model</Label>
                <select value={uploadForm.model_target} onChange={e => setUploadForm(f => ({ ...f, model_target: e.target.value }))}
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem 0.625rem', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                  {MODELS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <button type="submit" disabled={uploading} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 260px' : '1fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* Firmware table */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Filename', 'Version', 'Model', 'Size', ''].map(h => <th key={h} style={{ ...S.th, textAlign: h === '' ? 'right' : 'left' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {files.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', padding: '3rem' }}>
                    <HardDrive style={{ width: '36px', height: '36px', color: 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
                    <p style={{ color: 'var(--text-muted)' }}>No firmware uploaded yet</p>
                  </td></tr>
                ) : files.map(f => (
                  <tr key={f.id} onClick={() => setSelected(f)} style={{ cursor: 'pointer', background: selected?.id === f.id ? 'rgba(59,130,246,0.08)' : 'transparent', outline: selected?.id === f.id ? '1px solid rgba(59,130,246,0.25)' : 'none' }}
                    onMouseEnter={e => { if (selected?.id !== f.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                    onMouseLeave={e => { if (selected?.id !== f.id) e.currentTarget.style.background = 'transparent' }}>
                    <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '0.72rem' }}>{f.filename}</td>
                    <td style={S.td}>{f.version || '—'}</td>
                    <td style={S.td}><span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>{f.model_target}</span></td>
                    <td style={S.td}>{fmtBytes(f.size_bytes)}</td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      {isAdmin && (
                        <button onClick={ev => { ev.stopPropagation(); deleteFirmware(f.id, f.filename) }}
                          style={{ padding: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: '5px' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}>
                          <Trash2 style={{ width: '13px', height: '13px' }} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {files.length > 0 && <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', padding: '0.5rem 1rem', borderTop: '1px solid var(--border)' }}>Click a row to select for push</p>}
          </div>

          {/* Push panel */}
          {isAdmin && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.125rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send style={{ width: '14px', height: '14px', color: '#60a5fa' }} />
                <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>Push Firmware</p>
              </div>
              {selected ? (
                <div style={{ padding: '0.625rem', borderRadius: '8px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#60a5fa', fontFamily: 'monospace' }}>{selected.filename}</p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{selected.version} · {selected.model_target}</p>
                </div>
              ) : (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>← Select a firmware file</p>
              )}
              <div>
                <Label>Protocol</Label>
                <select value={pushProtocol} onChange={e => setPushProtocol(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem 0.625rem', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                  <option value="http">HTTP</option>
                  <option value="tftp">TFTP</option>
                  <option value="ftp">FTP</option>
                </select>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <Label>Devices</Label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <TinyBtn onClick={() => setPushDevices(devices.map(d => d.id))}>All</TinyBtn>
                    <TinyBtn onClick={() => setPushDevices([])}>None</TinyBtn>
                  </div>
                </div>
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {devices.map(d => (
                    <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.375rem', borderRadius: '6px' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <input type="checkbox" checked={pushDevices.includes(d.id)} onChange={() => toggleDevice(d.id)} style={{ accentColor: '#3b82f6' }} />
                      <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>{d.name}</p>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{d.ip}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={pushFirmware} disabled={pushing || !selected} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.5rem', fontSize: '0.8rem' }}>
                <Send style={{ width: '13px', height: '13px' }} />
                {pushing ? 'Pushing…' : `Push to ${pushDevices.length} Device(s)`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
