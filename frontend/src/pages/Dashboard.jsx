import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Monitor, Wifi, WifiOff, Bell, RefreshCw, TrendingUp, Activity, Plus } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import StatsCard from '../components/StatsCard'
import StatusBadge from '../components/StatusBadge'
import Header from '../components/Header'
import api from '../api/client'

const PIE_COLORS = ['#10b981', '#ef4444', '#94a3b8']

function DeviceCard({ s }) {
  return (
    <Link to={`/devices/${s.device_id}`}
      style={{
        display: 'block',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1.125rem',
        transition: 'all 0.2s',
        textDecoration: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{s.device_name}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>{s.device_ip}</p>
        </div>
        <StatusBadge status={s.status} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {[
          ['Model', s.device_model],
          ['Ext', s.extension || '—'],
          ['Uptime', s.uptime || '—'],
          ['FW', s.firmware_version || '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: k === 'Ext' || k === 'FW' ? 'monospace' : 'inherit' }}>{v}</span>
          </div>
        ))}
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState({ total: 0, online: 0, offline: 0, unpolled: 0, active_alerts: 0 })
  const [statuses, setStatuses] = useState([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)

  const fetchSummary = () => api.get('/monitoring/summary').then(r => setSummary(r.data)).catch(() => {})

  useEffect(() => {
    fetchSummary()
    const interval = setInterval(fetchSummary, 30000)
    const ws = new WebSocket(`ws://${window.location.host}/ws`)
    wsRef.current = ws
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'statuses') setStatuses(msg.data)
    }
    return () => { clearInterval(interval); ws.close() }
  }, [])

  const pieData = [
    { name: 'Online', value: summary.online },
    { name: 'Offline', value: summary.offline },
    { name: 'Unpolled', value: summary.unpolled },
  ].filter(d => d.value > 0)

  const liveLabel = connected
    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: '#34d399' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse-dot 2s ease-in-out infinite' }} />Live</span>
    : <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Connecting…</span>

  return (
    <div style={{ flex: 1 }}>
      <Header
        title="Dashboard"
        subtitle={liveLabel}
        actions={
          <button onClick={fetchSummary} className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
            <RefreshCw style={{ width: '13px', height: '13px' }} />
            Refresh
          </button>
        }
      />

      <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <StatsCard title="Total Devices" value={summary.total} icon={Monitor} color="blue" />
          <StatsCard title="Online" value={summary.online} icon={Wifi} color="green" />
          <StatsCard title="Offline" value={summary.offline} icon={WifiOff} color="red" />
          <StatsCard title="Active Alerts" value={summary.active_alerts} icon={Bell} color="yellow" />
        </div>

        {/* Charts + Device grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* Pie chart */}
          {summary.total > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status Split</p>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {pieData.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: PIE_COLORS[i], display: 'inline-block' }} />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Device grid */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Device Status <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({statuses.length})</span>
              </p>
              <Link to="/devices/new" className="btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem' }}>
                <Plus style={{ width: '12px', height: '12px' }} />
                Add Device
              </Link>
            </div>

            {statuses.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                <Monitor style={{ width: '40px', height: '40px', color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No devices polled yet.</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Add devices and wait for the first SNMP poll cycle (60s).</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.875rem' }}>
                {statuses.map(s => <DeviceCard key={s.device_id} s={s} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
