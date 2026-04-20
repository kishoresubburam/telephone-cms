const CONFIGS = {
  blue:   { icon: 'rgba(59,130,246,0.12)',  text: '#60a5fa', grad: 'rgba(59,130,246,0.06)'  },
  green:  { icon: 'rgba(16,185,129,0.12)',  text: '#34d399', grad: 'rgba(16,185,129,0.06)'  },
  red:    { icon: 'rgba(239,68,68,0.12)',   text: '#f87171', grad: 'rgba(239,68,68,0.06)'   },
  yellow: { icon: 'rgba(245,158,11,0.12)',  text: '#fbbf24', grad: 'rgba(245,158,11,0.06)'  },
  purple: { icon: 'rgba(167,139,250,0.12)', text: '#a78bfa', grad: 'rgba(167,139,250,0.06)' },
}

export default function StatsCard({ title, value, icon: Icon, color = 'blue', subtitle, trend }) {
  const c = CONFIGS[color] || CONFIGS.blue
  return (
    <div style={{
      background: `linear-gradient(135deg, var(--bg-card) 0%, ${c.grad} 100%)`,
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', right: '-10px', top: '-10px',
        width: '80px', height: '80px', borderRadius: '50%',
        background: c.icon, opacity: 0.5,
      }} />
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px',
        background: c.icon, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon style={{ width: '18px', height: '18px', color: c.text }} />
      </div>
      <div className="relative">
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
        <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, marginTop: '2px' }}>{value}</p>
        {subtitle && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitle}</p>}
      </div>
    </div>
  )
}
