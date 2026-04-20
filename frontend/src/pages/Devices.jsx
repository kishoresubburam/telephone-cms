import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, RotateCcw, Monitor } from 'lucide-react'
import Header from '../components/Header'
import StatusBadge from '../components/StatusBadge'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const S = {
  th: { padding: '0.625rem 1.125rem', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', background: 'rgba(10,17,32,0.6)', borderBottom: '1px solid var(--border)' },
  td: { padding: '0.75rem 1.125rem', fontSize: '0.8rem', borderBottom: '1px solid rgba(26,42,66,0.5)' },
  input: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 0.875rem', fontSize: '0.8rem', color: 'var(--text-primary)', outline: 'none', width: '100%' },
}

export default function Devices() {
  const { isAdmin } = useAuth()
  const [devices, setDevices] = useState([])
  const [groups, setGroups] = useState([])
  const [statuses, setStatuses] = useState({})
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    try {
      const [dRes, gRes, sRes] = await Promise.all([api.get('/devices'), api.get('/groups'), api.get('/monitoring/status')])
      setDevices(dRes.data)
      setGroups(gRes.data)
      const map = {}
      sRes.data.forEach(s => { map[s.device_id] = s.status })
      setStatuses(map)
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const deleteDevice = async (id, name) => {
    if (!confirm(`Delete device "${name}"?`)) return
    await api.delete(`/devices/${id}`)
    toast.success('Device deleted')
    fetchAll()
  }

  const pollNow = async (id) => {
    try { await api.post(`/monitoring/devices/${id}/poll`); toast.success('Polled'); fetchAll() } catch { toast.error('Poll failed') }
  }

  const filtered = devices.filter(d =>
    (!search || [d.name, d.ip, d.mac].some(v => v?.toLowerCase().includes(search.toLowerCase()))) &&
    (!filterGroup || d.group_id?.toString() === filterGroup)
  )

  return (
    <div style={{ flex: 1 }}>
      <Header title="Devices" subtitle={`${devices.length} registered`} />
      <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, IP, MAC…" style={{ ...S.input, paddingLeft: '2.25rem' }} />
          </div>
          <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 0.875rem', fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '140px' }}>
            <option value="">All Groups</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          {isAdmin && (
            <Link to="/devices/new" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', textDecoration: 'none' }}>
              <Plus style={{ width: '14px', height: '14px' }} />
              Add Device
            </Link>
          )}
        </div>

        {/* Table */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Device', 'IP Address', 'MAC', 'Model', 'Group', 'Status', ''].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', padding: '3rem' }}>
                  <Monitor style={{ width: '36px', height: '36px', color: 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
                  <p style={{ color: 'var(--text-muted)' }}>No devices found</p>
                </td></tr>
              ) : filtered.map((d, i) => (
                <tr key={d.id}
                  style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(10,17,32,0.3)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(10,17,32,0.3)'}
                >
                  <td style={S.td}>
                    <Link to={`/devices/${d.id}`} style={{ fontWeight: 600, color: '#60a5fa', textDecoration: 'none', fontSize: '0.82rem' }}>{d.name}</Link>
                    {d.location && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px' }}>{d.location}</p>}
                  </td>
                  <td style={{ ...S.td, fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{d.ip}</td>
                  <td style={{ ...S.td, fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.72rem' }}>{d.mac}</td>
                  <td style={{ ...S.td, color: 'var(--text-secondary)' }}>{d.model}</td>
                  <td style={{ ...S.td, color: 'var(--text-muted)' }}>{d.group?.name || '—'}</td>
                  <td style={S.td}><StatusBadge status={statuses[d.id] || 'unknown'} /></td>
                  <td style={{ ...S.td, textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <IconBtn icon={RotateCcw} title="Poll Now" onClick={() => pollNow(d.id)} color="#60a5fa" />
                      {isAdmin && <>
                        <IconBtn icon={Pencil} title="Edit" to={`/devices/${d.id}/edit`} color="#fbbf24" />
                        <IconBtn icon={Trash2} title="Delete" onClick={() => deleteDevice(d.id, d.name)} color="#f87171" />
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function IconBtn({ icon: Icon, title, onClick, to, color }) {
  const style = { padding: '0.375rem', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }
  const enter = e => { e.currentTarget.style.color = color; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }
  const leave = e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }
  if (to) return <Link to={to} title={title} style={{ ...style, textDecoration: 'none' }} onMouseEnter={enter} onMouseLeave={leave}><Icon style={{ width: '14px', height: '14px' }} /></Link>
  return <button title={title} onClick={onClick} style={style} onMouseEnter={enter} onMouseLeave={leave}><Icon style={{ width: '14px', height: '14px' }} /></button>
}
