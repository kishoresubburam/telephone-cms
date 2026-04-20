import { useEffect, useState } from 'react'
import { Plus, Trash2, Upload, Download, Send, Pencil, BookUser, X } from 'lucide-react'
import Header from '../components/Header'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const S = {
  th: { padding: '0.5rem 1rem', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', background: 'rgba(10,17,32,0.5)', borderBottom: '1px solid var(--border)' },
  td: { padding: '0.625rem 1rem', fontSize: '0.78rem', borderBottom: '1px solid rgba(26,42,66,0.4)', color: 'var(--text-secondary)' },
}

const emptyForm = { first_name: '', last_name: '', phone: '', account_type: 'SIP', department: '' }

export default function Phonebook() {
  const { isAdmin } = useAuth()
  const [entries, setEntries] = useState([])
  const [devices, setDevices] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [pushDevices, setPushDevices] = useState([])
  const [pushProtocol, setPushProtocol] = useState('http')
  const [pushing, setPushing] = useState(false)
  const [search, setSearch] = useState('')

  const fetchAll = async () => {
    const [eRes, dRes] = await Promise.all([api.get('/phonebook'), api.get('/devices')])
    setEntries(eRes.data)
    setDevices(dRes.data)
  }

  useEffect(() => { fetchAll() }, [])

  const submit = async (e) => {
    e.preventDefault()
    try {
      editEntry ? await api.put(`/phonebook/${editEntry.id}`, form) : await api.post('/phonebook', form)
      toast.success(editEntry ? 'Entry updated' : 'Entry added')
      closeForm()
      fetchAll()
    } catch (err) { toast.error(err.response?.data?.detail || 'Save failed') }
  }

  const closeForm = () => { setShowForm(false); setEditEntry(null); setForm(emptyForm) }
  const startEdit = (e) => { setEditEntry(e); setForm({ first_name: e.first_name, last_name: e.last_name, phone: e.phone, account_type: e.account_type, department: e.department }); setShowForm(true) }
  const deleteEntry = async (id) => { if (!confirm('Delete this entry?')) return; await api.delete(`/phonebook/${id}`); toast.success('Deleted'); fetchAll() }

  const importCSV = async (e) => {
    const file = e.target.files[0]; if (!file) return
    const fd = new FormData(); fd.append('file', file)
    try { const r = await api.post('/phonebook/import-csv', fd); toast.success(`Imported ${r.data.imported} entries`); fetchAll() } catch { toast.error('Import failed') }
    e.target.value = ''
  }

  const pushPhonebook = async () => {
    if (!pushDevices.length) { toast.error('Select at least one device'); return }
    setPushing(true)
    try {
      const r = await api.post('/phonebook/push', { device_ids: pushDevices.map(Number), protocol: pushProtocol })
      const ok = r.data.results.filter(x => x.success).length
      toast.success(`Pushed to ${ok}/${r.data.results.length} devices`)
    } catch { toast.error('Push failed') } finally { setPushing(false) }
  }

  const toggleDevice = id => setPushDevices(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const filtered = entries.filter(e => !search || `${e.first_name} ${e.last_name} ${e.phone}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ flex: 1 }}>
      <Header title="Phonebook" subtitle={`${entries.length} contacts`} />
      <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Toolbar */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            <button onClick={() => { closeForm(); setShowForm(true) }} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
              <Plus style={{ width: '14px', height: '14px' }} />Add Contact
            </button>
            <label className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', cursor: 'pointer' }}>
              <Upload style={{ width: '14px', height: '14px' }} />Import CSV
              <input type="file" accept=".csv" onChange={importCSV} style={{ display: 'none' }} />
            </label>
            <a href="/api/phonebook/export-xml" className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', textDecoration: 'none' }}>
              <Download style={{ width: '14px', height: '14px' }} />Export XML
            </a>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 260px' : '1fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* Contacts table */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts…"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '0.78rem', color: 'var(--text-primary)', flex: 1 }} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Name', 'Phone', 'Department', 'Type', isAdmin ? '' : null].filter(Boolean).map(h => <th key={h} style={{ ...S.th, textAlign: h === '' ? 'right' : 'left' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', padding: '3rem' }}>
                    <BookUser style={{ width: '36px', height: '36px', color: 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
                    <p style={{ color: 'var(--text-muted)' }}>No contacts yet</p>
                  </td></tr>
                ) : filtered.map(e => (
                  <tr key={e.id}
                    onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(59,130,246,0.04)'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...S.td, fontWeight: 500, color: 'var(--text-primary)' }}>{e.first_name} {e.last_name}</td>
                    <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '0.78rem' }}>{e.phone}</td>
                    <td style={S.td}>{e.department || '—'}</td>
                    <td style={S.td}><span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>{e.account_type}</span></td>
                    {isAdmin && (
                      <td style={{ ...S.td, textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                          <IBtn icon={Pencil} color="#fbbf24" onClick={() => startEdit(e)} />
                          <IBtn icon={Trash2} color="#f87171" onClick={() => deleteEntry(e.id)} />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Push panel */}
          {isAdmin && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.125rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send style={{ width: '14px', height: '14px', color: '#60a5fa' }} />
                <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>Push to Devices</p>
              </div>
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
                    <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.375rem', borderRadius: '6px', transition: 'background 0.15s' }}
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
              <button onClick={pushPhonebook} disabled={pushing} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.5rem', fontSize: '0.8rem' }}>
                <Send style={{ width: '13px', height: '13px' }} />
                {pushing ? 'Pushing…' : `Push to ${pushDevices.length} Device(s)`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <Modal title={editEntry ? 'Edit Contact' : 'Add Contact'} onClose={closeForm}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[['First Name', 'first_name', true], ['Last Name', 'last_name', false]].map(([l, k, r]) => (
                <div key={k}><Label>{l}{r && <span style={{ color: '#f87171' }}> *</span>}</Label>
                  <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} required={r}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem 0.625rem', fontSize: '0.8rem', color: 'var(--text-primary)', width: '100%' }} /></div>
              ))}
            </div>
            {[['Phone Number', 'phone', true], ['Department', 'department', false]].map(([l, k, r]) => (
              <div key={k}><Label>{l}{r && <span style={{ color: '#f87171' }}> *</span>}</Label>
                <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} required={r}
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem 0.625rem', fontSize: '0.8rem', color: 'var(--text-primary)', width: '100%' }} /></div>
            ))}
            <div style={{ display: 'flex', gap: '0.625rem', paddingTop: '0.5rem' }}>
              <button type="button" onClick={closeForm} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '0.5rem' }}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '0.5rem' }}>Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

const Label = ({ children }) => <p style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{children}</p>
const TinyBtn = ({ children, onClick }) => <button onClick={onClick} style={{ fontSize: '0.68rem', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>{children}</button>
const IBtn = ({ icon: Icon, color, onClick }) => (
  <button onClick={onClick} style={{ padding: '0.3rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: '5px', display: 'flex', alignItems: 'center' }}
    onMouseEnter={e => { e.currentTarget.style.color = color; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}>
    <Icon style={{ width: '13px', height: '13px' }} />
  </button>
)

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '440px', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}>
            <X style={{ width: '15px', height: '15px' }} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
