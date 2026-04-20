import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Layers, Monitor, X } from 'lucide-react'
import Header from '../components/Header'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Groups() {
  const { isAdmin } = useAuth()
  const [groups, setGroups] = useState([])
  const [devices, setDevices] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editGroup, setEditGroup] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })

  const fetchAll = async () => {
    const [gRes, dRes] = await Promise.all([api.get('/groups'), api.get('/devices')])
    setGroups(gRes.data); setDevices(dRes.data)
  }
  useEffect(() => { fetchAll() }, [])

  const deviceCount = gid => devices.filter(d => d.group_id === gid).length

  const submit = async (e) => {
    e.preventDefault()
    try {
      editGroup ? await api.put(`/groups/${editGroup.id}`, form) : await api.post('/groups', form)
      toast.success(editGroup ? 'Group updated' : 'Group created')
      closeForm(); fetchAll()
    } catch (err) { toast.error(err.response?.data?.detail || 'Save failed') }
  }

  const closeForm = () => { setShowForm(false); setEditGroup(null); setForm({ name: '', description: '' }) }
  const startEdit = g => { setEditGroup(g); setForm({ name: g.name, description: g.description }); setShowForm(true) }

  const deleteGroup = async (id, name) => {
    if (!confirm(`Delete group "${name}"? Devices will be ungrouped.`)) return
    await api.delete(`/groups/${id}`); toast.success('Group deleted'); fetchAll()
  }

  const GROUP_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']

  return (
    <div style={{ flex: 1 }}>
      <Header title="Device Groups" subtitle="Organize devices for bulk operations" />
      <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {isAdmin && (
          <div>
            <button onClick={() => { closeForm(); setShowForm(true) }} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
              <Plus style={{ width: '14px', height: '14px' }} />
              Create Group
            </button>
          </div>
        )}

        {groups.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '4rem', textAlign: 'center' }}>
            <Layers style={{ width: '40px', height: '40px', color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No groups yet</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Create groups to organize devices for bulk phonebook and firmware operations.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            {groups.map((g, i) => {
              const color = GROUP_COLORS[i % GROUP_COLORS.length]
              const count = deviceCount(g.id)
              return (
                <div key={g.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
                  {/* Color accent */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color, borderRadius: '12px 12px 0 0' }} />

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Layers style={{ width: '16px', height: '16px', color }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{g.name}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px' }}>{g.description || 'No description'}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '0.2rem' }}>
                        {[
                          { Icon: Pencil, color: '#fbbf24', fn: () => startEdit(g) },
                          { Icon: Trash2, color: '#f87171', fn: () => deleteGroup(g.id, g.name) },
                        ].map(({ Icon, color: c, fn }) => (
                          <button key={c} onClick={fn} style={{ padding: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: '5px' }}
                            onMouseEnter={e => { e.currentTarget.style.color = c; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}>
                            <Icon style={{ width: '13px', height: '13px' }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                    <Monitor style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{count} device{count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '400px', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{editGroup ? 'Edit Group' : 'Create Group'}</h2>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X style={{ width: '15px', height: '15px' }} />
              </button>
            </div>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {[['Group Name *', 'name', true], ['Description', 'description', false]].map(([l, k, r]) => (
                <div key={k}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{l}</p>
                  <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} required={r}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem 0.625rem', fontSize: '0.8rem', color: 'var(--text-primary)', width: '100%' }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '0.625rem', paddingTop: '0.25rem' }}>
                <button type="button" onClick={closeForm} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '0.5rem' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '0.5rem' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
