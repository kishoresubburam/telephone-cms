import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import api from '../api/client'
import toast from 'react-hot-toast'

const MODELS = ['GRP2602P', 'GRP2604P', 'GRP2614', 'GRP2616', 'GXV3350', 'GXV3380', 'GXV3480']
const defaultForm = { name: '', ip: '', mac: '', model: 'GRP2602P', group_id: '', snmp_community: 'public', admin_user: 'admin', admin_password: 'admin', location: '', notes: '' }

const inputStyle = { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 0.875rem', fontSize: '0.82rem', color: 'var(--text-primary)', width: '100%' }
const labelStyle = { display: 'block', fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }

export default function AddDevice() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState(defaultForm)
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/groups').then(r => setGroups(r.data)).catch(() => {})
    if (isEdit) {
      api.get(`/devices/${id}`).then(r => {
        const d = r.data
        setForm({ name: d.name, ip: d.ip, mac: d.mac, model: d.model, group_id: d.group_id || '', snmp_community: d.snmp_community, admin_user: d.admin_user, admin_password: '', location: d.location, notes: d.notes })
      }).catch(() => toast.error('Failed to load device'))
    }
  }, [id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const payload = { ...form, group_id: form.group_id || null }
    if (!payload.admin_password) delete payload.admin_password
    try {
      isEdit ? await api.put(`/devices/${id}`, payload) : await api.post('/devices', payload)
      toast.success(isEdit ? 'Device updated' : 'Device added')
      navigate('/devices')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed')
    } finally { setLoading(false) }
  }

  const Field = ({ label, name, type = 'text', placeholder, required, span }) => (
    <div style={span ? { gridColumn: 'span 2' } : {}}>
      <label style={labelStyle}>{label}{required && <span style={{ color: '#f87171', marginLeft: '3px' }}>*</span>}</label>
      <input type={type} value={form[name]} onChange={e => set(name, e.target.value)} placeholder={placeholder} required={required} style={inputStyle} />
    </div>
  )

  const Select = ({ label, name, children }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <select value={form[name]} onChange={e => set(name, e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>{children}</select>
    </div>
  )

  return (
    <div style={{ flex: 1 }}>
      <Header title={isEdit ? 'Edit Device' : 'Add Device'} subtitle="Configure a telephone device" />
      <div style={{ padding: '1.75rem', maxWidth: '640px' }}>
        <form onSubmit={submit}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
            {/* Section: Identity */}
            <SectionHeader title="Device Identity" />
            <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Display Name" name="name" placeholder="Reception Phone" required />
              <Field label="IP Address" name="ip" placeholder="192.168.1.100" required />
              <Field label="MAC Address" name="mac" placeholder="00:0B:82:xx:xx:xx" required />
              <Select label="Model" name="model">
                {MODELS.map(m => <option key={m}>{m}</option>)}
              </Select>
              <Select label="Group" name="group_id">
                <option value="">No Group</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
              <Field label="Location" name="location" placeholder="Floor 2, Room 201" />
            </div>

            {/* Section: Access */}
            <SectionHeader title="Access Credentials" />
            <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="SNMP Community" name="snmp_community" placeholder="public" />
              <div />
              <Field label="Admin Username" name="admin_user" placeholder="admin" />
              <Field label="Admin Password" name="admin_password" type="password" placeholder={isEdit ? '(unchanged)' : 'admin'} />
            </div>

            {/* Section: Notes */}
            <SectionHeader title="Notes" />
            <div style={{ padding: '1.25rem' }}>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
                placeholder="Optional notes about this device…"
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            {/* Footer */}
            <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => navigate('/devices')} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Saving…' : isEdit ? 'Update Device' : 'Add Device'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(10,17,32,0.6)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</p>
    </div>
  )
}
