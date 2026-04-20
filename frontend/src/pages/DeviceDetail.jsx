import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { RefreshCw, Download, Pencil, Clock, Cpu, MemoryStick } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import Header from '../components/Header'
import StatusBadge from '../components/StatusBadge'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const S = {
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' },
  th: { padding: '0.5rem 1rem', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--border)', background: 'rgba(10,17,32,0.5)' },
  td: { padding: '0.625rem 1rem', fontSize: '0.78rem', borderBottom: '1px solid rgba(26,42,66,0.4)', color: 'var(--text-secondary)' },
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.72rem' }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: '3px' }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>)}
    </div>
  )
}

export default function DeviceDetail() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const [device, setDevice] = useState(null)
  const [history, setHistory] = useState([])
  const [backups, setBackups] = useState([])
  const [polling, setPolling] = useState(false)
  const [backing, setBacking] = useState(false)

  const fetchAll = async () => {
    try {
      const [dRes, hRes, bRes] = await Promise.all([api.get(`/devices/${id}`), api.get(`/monitoring/devices/${id}/status?limit=20`), api.get(`/config-backup/${id}`)])
      setDevice(dRes.data)
      setHistory(hRes.data)
      setBackups(bRes.data)
    } catch { toast.error('Failed to load device') }
  }

  useEffect(() => { fetchAll() }, [id])

  const pollNow = async () => {
    setPolling(true)
    try { await api.post(`/monitoring/devices/${id}/poll`); toast.success('Poll complete'); fetchAll() }
    catch { toast.error('Poll failed') } finally { setPolling(false) }
  }

  const backupNow = async () => {
    if (!isAdmin) return
    setBacking(true)
    try { await api.post(`/config-backup/${id}/backup`); toast.success('Config backed up'); fetchAll() }
    catch (err) { toast.error(err.response?.data?.detail || 'Backup failed') } finally { setBacking(false) }
  }

  const latest = history[0]
  const chartData = [...history].reverse().map(h => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: h.status === 'online' ? 1 : 0,
  }))

  if (!device) return <div style={{ flex: 1, padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div>

  return (
    <div style={{ flex: 1 }}>
      <Header
        title={device.name}
        subtitle={`${device.ip} · ${device.model}`}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={pollNow} disabled={polling} className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
              <RefreshCw style={{ width: '12px', height: '12px', animation: polling ? 'spin 1s linear infinite' : 'none' }} />
              {polling ? 'Polling…' : 'Poll Now'}
            </button>
            {isAdmin && <>
              <button onClick={backupNow} disabled={backing} className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
                <Download style={{ width: '12px', height: '12px' }} />
                {backing ? 'Backing up…' : 'Backup'}
              </button>
              <Link to={`/devices/${id}/edit`} className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', textDecoration: 'none' }}>
                <Pencil style={{ width: '12px', height: '12px' }} />
                Edit
              </Link>
            </>}
          </div>
        }
      />

      <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Top row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {/* Device Info */}
          <InfoCard title="Device Info">
            <dl style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[
                ['Status', <StatusBadge status={latest?.status || 'unknown'} size="lg" />],
                ['IP Address', <code style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{device.ip}</code>],
                ['MAC Address', <code style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{device.mac}</code>],
                ['Model', device.model],
                ['Group', device.group?.name || '—'],
                ['Location', device.location || '—'],
                ['SNMP Community', device.snmp_community],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(26,42,66,0.4)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>{v}</span>
                </div>
              ))}
            </dl>
          </InfoCard>

          {/* Latest Poll */}
          <InfoCard title="Latest Poll">
            {latest ? (
              <dl style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  ['Polled At', new Date(latest.timestamp).toLocaleString()],
                  ['Uptime', latest.uptime || '—'],
                  ['Firmware', latest.firmware_version || '—'],
                  ['Extension', latest.extension || '—'],
                  ['CPU', latest.cpu_usage != null ? `${latest.cpu_usage.toFixed(1)}%` : '—'],
                  ['Memory', latest.memory_usage != null ? `${latest.memory_usage.toFixed(1)}%` : '—'],
                  ['Sys Desc', latest.sys_descr ? latest.sys_descr.substring(0, 55) + '…' : '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(26,42,66,0.4)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', maxWidth: '60%', textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </dl>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <Clock style={{ width: '32px', height: '32px', color: 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No poll data yet. Click "Poll Now".</p>
              </div>
            )}
          </InfoCard>
        </div>

        {/* Uptime chart */}
        {chartData.length > 1 && (
          <div style={S.card}>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Availability (last {chartData.length} polls)</p>
            </div>
            <div style={{ padding: '1rem' }}>
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,42,66,0.6)" />
                  <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 1]} tickFormatter={v => v === 1 ? 'On' : 'Off'} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="stepAfter" dataKey="status" stroke="#10b981" strokeWidth={2} dot={false} name="Online" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Poll History */}
        <div style={S.card}>
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Poll History</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Time', 'Status', 'Uptime', 'Firmware', 'Extension'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {history.length === 0
                ? <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No poll history yet</td></tr>
                : history.map(h => (
                  <tr key={h.id}>
                    <td style={S.td}>{new Date(h.timestamp).toLocaleString()}</td>
                    <td style={S.td}><StatusBadge status={h.status} /></td>
                    <td style={S.td}>{h.uptime || '—'}</td>
                    <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '0.72rem' }}>{h.firmware_version || '—'}</td>
                    <td style={{ ...S.td, fontFamily: 'monospace' }}>{h.extension || '—'}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Config Backups */}
        {backups.length > 0 && (
          <div style={S.card}>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Config Backups</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Filename', 'Date', ''].map(h => <th key={h} style={{ ...S.th, textAlign: h === '' ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
              <tbody>
                {backups.map(b => (
                  <tr key={b.id}>
                    <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '0.72rem' }}>{b.filename}</td>
                    <td style={S.td}>{new Date(b.created_at).toLocaleString()}</td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      <a href={`/api/config-backup/download/${b.id}`} style={{ color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', textDecoration: 'none' }}>
                        <Download style={{ width: '13px', height: '13px' }} /> Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoCard({ title, children }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'rgba(10,17,32,0.5)' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</p>
      </div>
      <div style={{ padding: '0.25rem 1.25rem 1rem' }}>{children}</div>
    </div>
  )
}
