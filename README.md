# Telephone CMS

A modern, full-stack web application for centralized IP phone management. Monitor device status in real time, push firmware updates, manage phonebooks, and configure phone fleets — all from a single dashboard.

![Dashboard](https://img.shields.io/badge/status-production--ready-brightgreen)
![Python](https://img.shields.io/badge/Python-3.11%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688)
![React](https://img.shields.io/badge/React-18-61DAFB)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Features

| Feature | Details |
|---|---|
| **Live Dashboard** | Real-time device status grid via WebSocket, pie chart, stats cards |
| **SNMP Monitoring** | Polls all devices every 60 seconds — uptime, firmware version, extension |
| **Device Management** | Add, edit, delete, reboot devices; per-device SNMP history and uptime chart |
| **Device Groups** | Organize devices into groups for bulk phonebook and firmware operations |
| **Phonebook** | CRUD contacts, CSV import, XML export, push to all devices via HTTP / TFTP / FTP |
| **Firmware Updates** | Upload `.bin` files, push to selected devices or groups via HTTP / TFTP / FTP |
| **Config Backup** | Download running config from devices and restore on demand |
| **Alert Rules** | Trigger on offline, high CPU, or high memory — with optional email notifications |
| **Built-in TFTP** | Internal TFTP server (port 6969) — no external software needed |
| **Built-in FTP** | Internal FTP server (port 2121) — no external software needed |
| **HTTP Provisioning** | Serves config and phonebook files for device auto-provisioning |
| **Authentication** | JWT login with admin and viewer roles |

---

## Supported Devices

- Grandstream GRP2602P, GRP2604P, GRP2614, GRP2616
- Grandstream GXV3350, GXV3380, GXV3480
- Any SNMP-capable SIP phone (standard OIDs)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+ · FastAPI · SQLAlchemy · SQLite |
| Frontend | React 18 · Vite · Tailwind CSS · Recharts |
| SNMP | pysnmp 7.x (async) |
| TFTP | tftpy |
| FTP | pyftpdlib |
| Auth | JWT (python-jose) · bcrypt (passlib) |
| Scheduler | APScheduler |
| Real-time | FastAPI WebSockets |

---

## Project Structure

```
telephone-cms/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── models.py                # SQLAlchemy ORM models
│   ├── schemas.py               # Pydantic request/response schemas
│   ├── auth.py                  # JWT + bcrypt authentication
│   ├── config.py                # App settings (env-configurable)
│   ├── database.py              # DB engine and session
│   ├── routers/
│   │   ├── auth.py              # Login, register, user management
│   │   ├── devices.py           # Device CRUD + reboot
│   │   ├── groups.py            # Group CRUD
│   │   ├── monitoring.py        # SNMP status, poll history
│   │   ├── phonebook.py         # Contacts CRUD + push + XML export
│   │   ├── firmware.py          # Firmware upload + push
│   │   ├── config_backup.py     # Config backup/restore
│   │   └── alerts.py            # Alert rules and history
│   ├── services/
│   │   ├── snmp_service.py      # pysnmp v7 async polling
│   │   ├── tftp_service.py      # Built-in TFTP server
│   │   ├── ftp_service.py       # Built-in FTP server
│   │   ├── http_provision.py    # HTTP push to device admin API
│   │   ├── alert_service.py     # Alert evaluation + email
│   │   └── scheduler.py        # APScheduler polling loop
│   ├── provisioning/            # Runtime: firmware, configs, phonebooks
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Router + auth guard
│   │   ├── api/client.js        # Axios with JWT interceptor
│   │   ├── context/AuthContext.jsx
│   │   ├── components/          # Sidebar, Header, StatusBadge, StatsCard
│   │   └── pages/               # Dashboard, Devices, Phonebook, Firmware…
│   ├── package.json
│   └── vite.config.js
├── start.sh                     # One-command startup script
└── README.md
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- `pip` and `npm`

### 1. Clone

```bash
git clone https://github.com/kishoresubburam/telephone-cms.git
cd telephone-cms
```

### 2. Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 4. Start everything

```bash
cd ..
./start.sh
```

Or start manually in two terminals:

```bash
# Terminal 1 — Backend
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend dev server
cd frontend
npm run dev
```

### 5. Open

| Service | URL |
|---|---|
| **Frontend** | http://localhost:5173 |
| **API docs** | http://localhost:8000/docs |
| **Default login** | `admin` / `admin123` |

> **Change the default password immediately** after first login.

---

## Configuration

All settings can be overridden via a `.env` file in the `backend/` directory.

```env
# Security
SECRET_KEY=your-long-random-secret-key

# Database (default: SQLite)
DATABASE_URL=sqlite:///./cms.db

# SNMP
SNMP_COMMUNITY=public
SNMP_PORT=161
POLL_INTERVAL_SECONDS=60

# Built-in TFTP server
TFTP_HOST=0.0.0.0
TFTP_PORT=6969

# Built-in FTP server
FTP_HOST=0.0.0.0
FTP_PORT=2121
FTP_USER=telcms
FTP_PASSWORD=telcms_ftp_pass

# Email alerts (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=cms@yourcompany.com
```

---

## Device Provisioning

Point your phones to the CMS server for auto-provisioning:

| Protocol | URL / Address |
|---|---|
| HTTP | `http://<server-ip>:8000/provision/` |
| Phonebook XML | `http://<server-ip>:8000/phonebook/provision/<MAC>` |
| TFTP | `<server-ip>:6969` |
| FTP | `ftp://<server-ip>:2121` |

On Grandstream phones: **Menu → Settings → Upgrade → Config Server Path**

---

## API Reference

Interactive API documentation is available at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc`.

Key endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login, returns JWT token |
| `GET` | `/api/devices` | List all devices |
| `POST` | `/api/devices` | Add a device |
| `GET` | `/api/monitoring/summary` | Dashboard stats |
| `POST` | `/api/monitoring/devices/{id}/poll` | Poll device now |
| `POST` | `/api/phonebook/push` | Push phonebook to devices |
| `POST` | `/api/firmware/upload` | Upload firmware file |
| `POST` | `/api/firmware/push` | Push firmware to devices |
| `POST` | `/api/config-backup/{id}/backup` | Backup device config |
| `GET` | `/api/alerts` | List alerts |
| `POST` | `/api/alerts/rules` | Create alert rule |
| `GET` | `/ws` | WebSocket — live device status |

---

## User Roles

| Role | Access |
|---|---|
| **Admin** | Full access — add/edit/delete devices, push firmware, manage users and rules |
| **Viewer** | Read-only — dashboard, device status, alert history |

---

## Phonebook CSV Format

Import contacts using a CSV file with these columns:

```csv
first_name,last_name,phone,department,account_type
John,Doe,1001,Reception,SIP
Jane,Smith,1002,IT,SIP
```

Export is always in Grandstream XML format, compatible with all GRP and GXV models.

---

## Screenshots

> Screenshots can be added here after deployment.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes
4. Push and open a pull request

---

*Built with FastAPI + React · Designed for IP phone fleet management*
