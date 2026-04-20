import { Bell, Wifi } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'

export default function Header({ title, subtitle, actions }) {
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    const fetch = () => api.get('/monitoring/summary').then(r => setAlertCount(r.data.active_alerts || 0)).catch(() => {})
    fetch()
    const t = setInterval(fetch, 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="flex items-center justify-between px-7 py-4 sticky top-0 z-10"
      style={{
        background: 'rgba(10,17,32,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
      <div>
        <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <Link to="/alerts" className="relative p-2 rounded-lg transition-all"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs text-white flex items-center justify-center font-bold"
              style={{ background: '#ef4444', fontSize: '10px' }}>
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
