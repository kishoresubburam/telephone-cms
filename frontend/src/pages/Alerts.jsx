import { useEffect, useState } from 'react'
import { Bell, Plus, Trash2, Check, X, ShieldAlert } from 'lucide-react'
import Header from '../components/Header'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const SEV = {
  critical: { text: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  warning:  { text: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  info:     { text: '#60a5fa', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
}

const S = {
  th: { padding: '0.5rem 1rem', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', background: 'rgba(10,17,32,0.5)', borderBottom: '1px solid var(--border)' },
  td: { padding: '0.625rem 1rem', fontSize: '0.78rem', borderBottom: '1px solid rgba(26,42,66,0.4)', color: 'var(--text-secondary)' },
}

const Label = ({ children }) => <p style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{children}</p>

export default function Alerts() {
  const { isAdmin } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [rules, setRules] = useState([])
  const [devices, setDevices] = useState([])
  const [groups, setGroups] = useState([])
  const [tab, setTab] = useState('alerts')
  const [unresolved, setUnresolved] = useState(false)
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [ruleForm, setRuleForm] = useState({ name: '', rule_type: 'offline', device_id: '', group_id: '', threshold: '', notify_email: '' })

  const fetchAll = async () => {
    const [aRes, rRes, dRes, gRes] = await Promise.all([
      api.get(`/alerts?unresolved_only=${unresolved}&limit=100`),
      api.get('/alerts/rules'), api.get('/devices'), api.get('/groups'),
    ])
    setAlerts(aRes.data); setRules(rRes.data); setDevices(dRes.data); setGroups(gRes.data)
  }
  useEffect(() => { fetchAll() }, [unresolved])

  const acknowledge = async id => { await api.post(`/alerts/${id}/acknowledge`); toast.success('Acknowledged'); fetchAll() }
  const resolve = async id => { await api.post(`/alerts/${id}/resolve`); toast.success('Resolved'); fetchAll() }
  const toggleRule = async id => { await api.put(`/alerts/rules/${id}/toggle`); fetchAll() }
  const deleteRule = async id => { await api.delete(`/alerts/rules/${id}`); toast.success('Rule deleted'); fetchAll() }

  const createRule = async (e) => {
    e.preventDefault()
    const p = { ...ruleForm, device_id: ruleForm.device_id || null, group_id: ruleForm.group_id || null, threshold: ruleForm.threshold ? parseFloat(ruleForm.threshold) : null }
    try { await api.post('/alerts/rules', p); toast.success('Rule created'); setShowRuleForm(false); setRuleForm({ name: '', rule_type: 'offline', device_id: '', group_id: '', threshold: '', notify_email: '' }); fetchAll() }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const deviceName = id => devices.find(d => d.id === id)?.name || `Device #${id}`

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{
      padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, transition: 'all 0.15s',
      background: tab === id ? 'var(--accent)' : 'transparent',
      color: tab === id ? 'white' : 'var(--text-muted)',
    }}>{label}</button>
  )

  return (
    <div style={{ flex: 1 }}>
      <Header title="Alerts" subtitle="Monitor and manage device alerts" />
      <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-card)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <TabBtn id="alerts" label={`Alerts${alerts.filter(a => !a.resolved_at && !a.acknowledged).length > 0 ? ` (${alerts.filter(a => !a.resolved_at && !a.acknowledged).length})` : ''}`} />
            <TabBtn id="rules" label="Rules" />
          </div>
          {tab === 'alerts' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={unresolved} onChange={e => setUnresolved(e.target.checked)} style={{ accentColor: '#3b82f6' }} />
              Unresolved only
            </label>
          )}
          {tab === 'rules' && isAdmin && (
            <button onClick={() => setShowRuleForm(true)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
              <Plus style={{ width: '14px', height: '14px' }} />Add Rule
            </button>
          )}
        </div>

        {/* Alerts table */}
        {tab === 'alerts' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Severity', 'Device', 'Message', 'Time', ''].map(h => <th key={h} style={{ ...S.th, textAlign: h === '' ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
              <tbody>
                {alerts.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', padding: '3rem' }}>
                    <Bell style={{ width: '36px', height: '36px', color: 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
                    <p style={{ color: 'var(--text-muted)' }}>No alerts</p>
                  </td></tr>
                ) : alerts.map(a => {
                  const sev = SEV[a.severity] || SEV.info
                  return (
                    <tr key={a.id} style={{ opacity: a.resolved_at ? 0.45 : 1 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={S.td}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 500, color: sev.text, background: sev.bg, border: `1px solid ${sev.border}` }}>
                          <ShieldAlert style={{ width: '10px', height: '10px' }} />{a.severity}
                        </span>
                      </td>
                      <td style={{ ...S.td, fontWeight: 500, color: 'var(--text-primary)' }}>{deviceName(a.device_id)}</td>
                      <td style={{ ...S.td, maxWidth: '300px' }}>
                        <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.message}</p>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{a.rule_type}</p>
                      </td>
                      <td style={{ ...S.td, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{new Date(a.triggered_at).toLocaleString()}</td>
                      <td style={{ ...S.td, textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                          {!a.acknowledged && <IBtn icon={Check} color="#10b981" onClick={() => acknowledge(a.id)} title="Acknowledge" />}
                          {!a.resolved_at && isAdmin && <IBtn icon={X} color="#f87171" onClick={() => resolve(a.id)} title="Resolve" />}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rules table */}
        {tab === 'rules' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Rule', 'Type', 'Scope', 'Status', isAdmin ? '' : null].filter(Boolean).map(h => <th key={h} style={{ ...S.th, textAlign: h === '' ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
              <tbody>
                {rules.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No alert rules configured</td></tr>
                ) : rules.map(r => (
                  <tr key={r.id}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...S.td, fontWeight: 500, color: 'var(--text-primary)' }}>{r.name}</td>
                    <td style={S.td}><span style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{r.rule_type}</span></td>
                    <td style={S.td}>{r.device_id ? deviceName(r.device_id) : r.group_id ? `Group #${r.group_id}` : 'All devices'}</td>
                    <td style={S.td}>
                      <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 500, color: r.is_active ? '#34d399' : 'var(--text-muted)', background: r.is_active ? 'rgba(16,185,129,0.08)' : 'rgba(100,116,139,0.08)', border: `1px solid ${r.is_active ? 'rgba(16,185,129,0.2)' : 'var(--border)'}` }}>
                        {r.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ ...S.td, textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                          <button onClick={() => toggleRule(r.id)} style={{ fontSize: '0.72rem', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
                            {r.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <IBtn icon={Trash2} color="#f87171" onClick={() => deleteRule(r.id)} title="Delete" />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rule Modal */}
      {showRuleForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '440px', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Create Alert Rule</h2>
              <button onClick={() => setShowRuleForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X style={{ width: '15px', height: '15px' }} /></button>
            </div>
            <form onSubmit={createRule} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {[['Rule Name *', 'name', 'text', true]].map(([l, k, t, r]) => (
                <div key={k}><Label>{l}</Label>
                  <input type={t} value={ruleForm[k]} onChange={e => setRuleForm(f => ({ ...f, [k]: e.target.value }))} required={r}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem 0.625rem', fontSize: '0.8rem', color: 'var(--text-primary)', width: '100%' }} /></div>
              ))}
              <div><Label>Rule Type</Label>
                <select value={ruleForm.rule_type} onChange={e => setRuleForm(f => ({ ...f, rule_type: e.target.value }))}
                  style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem 0.625rem', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                  <option value="offline">Device Offline</option>
                  <option value="high_cpu">High CPU Usage</option>
                  <option value="high_memory">High Memory Usage</option>
                </select>
              </div>
              {(ruleForm.rule_type === 'high_cpu' || ruleForm.rule_type === 'high_memory') && (
                <div><Label>Threshold (%)</Label>
                  <input type="number" min="1" max="100" value={ruleForm.threshold} onChange={e => setRuleForm(f => ({ ...f, threshold: e.target.value }))} placeholder="90"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem 0.625rem', fontSize: '0.8rem', color: 'var(--text-primary)', width: '100%' }} /></div>
              )}
              <div><Label>Apply to Device</Label>
                <select value={ruleForm.device_id} onChange={e => setRuleForm(f => ({ ...f, device_id: e.target.value, group_id: '' }))}
                  style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem 0.625rem', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                  <option value="">All Devices</option>
                  {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div><Label>Notify Email</Label>
                <input type="email" value={ruleForm.notify_email} onChange={e => setRuleForm(f => ({ ...f, notify_email: e.target.value }))} placeholder="admin@company.com"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem 0.625rem', fontSize: '0.8rem', color: 'var(--text-primary)', width: '100%' }} /></div>
              <div style={{ display: 'flex', gap: '0.625rem', paddingTop: '0.25rem' }}>
                <button type="button" onClick={() => setShowRuleForm(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '0.5rem' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '0.5rem' }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const IBtn = ({ icon: Icon, color, onClick, title }) => (
  <button title={title} onClick={onClick} style={{ padding: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: '5px', display: 'flex', alignItems: 'center' }}
    onMouseEnter={e => { e.currentTarget.style.color = color; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}>
    <Icon style={{ width: '13px', height: '13px' }} />
  </button>
)
