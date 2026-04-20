export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = {
    online:  { dot: '#10b981', text: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)',  label: 'Online',  pulse: true },
    offline: { dot: '#ef4444', text: '#f87171', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',   label: 'Offline', pulse: false },
    warning: { dot: '#f59e0b', text: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)',  label: 'Warning', pulse: false },
    unknown: { dot: '#64748b', text: '#94a3b8', bg: 'rgba(100,116,139,0.08)',border: 'rgba(100,116,139,0.2)', label: 'Unknown', pulse: false },
  }
  const s = cfg[status] || cfg.unknown
  const pad = size === 'lg' ? '0.375rem 0.75rem' : '0.2rem 0.625rem'
  const fs = size === 'lg' ? '0.8rem' : '0.7rem'

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
      padding: pad, borderRadius: '999px', fontSize: fs, fontWeight: 500,
      color: s.text, background: s.bg, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%', background: s.dot, flexShrink: 0,
        animation: s.pulse ? 'pulse-dot 2s ease-in-out infinite' : 'none',
      }} />
      {s.label}
    </span>
  )
}
