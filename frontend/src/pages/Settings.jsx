import { useEffect, useState } from 'react'
import { Server, Wifi, HardDrive, Mail, ShieldCheck, Copy, Check } from 'lucide-react'
import Header from '../components/Header'
import api from '../api/client'
import toast from 'react-hot-toast'

function useCopy() {
  const [copied, setCopied] = useState(null)
  const copy = async (text, id) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }
  return { copied, copy }
}

function CopyCode({ text, id, copied, copy }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 0.875rem', marginTop: '0.375rem' }}>
      <code style={{ fontSize: '0.78rem', color: '#60a5fa', fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>{text}</code>
      <button onClick={() => copy(text, id)} style={{ marginLeft: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: copied === id ? '#10b981' : 'var(--text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {copied === id ? <Check style={{ width: '13px', height: '13px' }} /> : <Copy style={{ width: '13px', height: '13px' }} />}
      </button>
    </div>
  )
}

const SCard = ({ icon: Icon, title, iconColor = '#60a5fa', children }) => (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
    <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.625rem', background: 'rgba(10,17,32,0.4)' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: `${iconColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon style={{ width: '14px', height: '14px', color: iconColor }} />
      </div>
      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</p>
    </div>
    <div style={{ padding: '1.125rem 1.25rem' }}>{children}</div>
  </div>
)

const Row = ({ label, value, mono }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(26,42,66,0.4)' }}>
    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontFamily: mono ? 'monospace' : 'inherit' }}>{value ?? '—'}</span>
  </div>
)

const StatusPill = ({ running }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 500, color: running ? '#34d399' : '#f87171', background: running ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${running ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: running ? '#10b981' : '#ef4444', animation: running ? 'pulse-dot 2s ease-in-out infinite' : 'none' }} />
    {running ? 'Running' : 'Stopped'}
  </span>
)

export default function Settings() {
  const [info, setInfo] = useState(null)
  const { copied, copy } = useCopy()

  useEffect(() => {
    api.get('/server-info').then(r => setInfo(r.data)).catch(() => {})
  }, [])

  const host = window.location.hostname
  const port = info?.http_provision_port || 8000

  return (
    <div style={{ flex: 1 }}>
      <Header title="Settings" subtitle="Server status and configuration reference" />
      <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '720px' }}>

        <SCard icon={Server} title="Built-in Servers">
          {info ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <Row label="TFTP Server" value={<StatusPill running={info.tftp.running} />} />
              <Row label="TFTP Address" value={`${host}:${info.tftp.port}`} mono />
              <Row label="TFTP Root" value={info.tftp.root} mono />
              <Row label="FTP Server" value={<StatusPill running={info.ftp.running} />} />
              <Row label="FTP Address" value={`${host}:${info.ftp.port}`} mono />
              <Row label="FTP User" value={info.ftp.user} mono />
              <Row label="Poll Interval" value={`${info.poll_interval}s`} />
            </div>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading…</p>}
        </SCard>

        <SCard icon={HardDrive} title="Provisioning URLs" iconColor="#a78bfa">
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
            Configure devices to pull provisioning from this server:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'HTTP Provisioning Root', text: `http://${host}:${port}/provision/`, id: 'prov' },
              { label: 'Phonebook XML (per device)', text: `http://${host}:${port}/phonebook/provision/{MAC}`, id: 'pb' },
              { label: 'TFTP Server', text: `${host}:${info?.tftp?.port || 6969}`, id: 'tftp' },
              { label: 'FTP Server', text: `ftp://${host}:${info?.ftp?.port || 2121}`, id: 'ftp' },
            ].map(({ label, text, id }) => (
              <div key={id}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>{label}</p>
                <CopyCode text={text} id={id} copied={copied} copy={copy} />
              </div>
            ))}
          </div>
        </SCard>

        <SCard icon={Mail} title="Email Alerts (SMTP)" iconColor="#fbbf24">
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
            Configure SMTP in <code style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#60a5fa', background: 'var(--bg-surface)', padding: '1px 6px', borderRadius: '4px' }}>backend/.env</code>:
          </p>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.875rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: 2 }}>
            {[
              ['SMTP_HOST', 'smtp.gmail.com'],
              ['SMTP_PORT', '587'],
              ['SMTP_USER', 'your@email.com'],
              ['SMTP_PASSWORD', 'your-app-password'],
              ['SMTP_FROM', 'cms@yourcompany.com'],
            ].map(([k, v]) => (
              <div key={k}>
                <span style={{ color: '#60a5fa' }}>{k}</span>
                <span style={{ color: 'var(--text-muted)' }}>=</span>
                <span style={{ color: '#34d399' }}>{v}</span>
              </div>
            ))}
          </div>
        </SCard>

        <SCard icon={ShieldCheck} title="Security" iconColor="#f87171">
          <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', marginTop: '5px', flexShrink: 0, animation: 'pulse-dot 2s ease-in-out infinite' }} />
            <div>
              <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fbbf24', marginBottom: '3px' }}>Change default credentials</p>
              <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Default login is <code style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>admin / admin123</code>. Change it immediately in production. JWT tokens expire after 8 hours.</p>
            </div>
          </div>
        </SCard>

      </div>
    </div>
  )
}
