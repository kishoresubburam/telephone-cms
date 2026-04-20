import os
import json
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import engine, Base, get_db
import models
from auth import hash_password
from sqlalchemy.orm import Session
from config import settings
from services.scheduler import start_scheduler, stop_scheduler, latest_statuses
from services.tftp_service import start_tftp_server, stop_tftp_server
from services.ftp_service import start_ftp_server, stop_ftp_server

from routers import auth, devices, groups, monitoring, phonebook, firmware, config_backup, alerts

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

connected_ws: list[WebSocket] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables
    Base.metadata.create_all(bind=engine)

    # Seed default admin user if none exists
    db: Session = next(get_db())
    if not db.query(models.User).first():
        admin = models.User(
            username="admin",
            email="admin@localhost",
            hashed_password=hash_password("admin123"),
            role="admin",
        )
        db.add(admin)
        db.commit()
        logger.info("Default admin user created: admin / admin123")
    db.close()

    # Start background services
    try:
        start_tftp_server()
    except Exception as e:
        logger.warning(f"TFTP server failed to start: {e}")

    try:
        start_ftp_server()
    except Exception as e:
        logger.warning(f"FTP server failed to start: {e}")

    start_scheduler()

    # Start WebSocket broadcast task
    asyncio.create_task(broadcast_status())

    yield

    stop_scheduler()
    stop_tftp_server()
    stop_ftp_server()


app = FastAPI(title="Telephone CMS", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(devices.router)
app.include_router(groups.router)
app.include_router(monitoring.router)
app.include_router(phonebook.router)
app.include_router(firmware.router)
app.include_router(config_backup.router)
app.include_router(alerts.router)

# Serve provisioning files over HTTP
PROVISION_ROOT = os.path.abspath(settings.tftp_root)
os.makedirs(PROVISION_ROOT, exist_ok=True)
app.mount("/provision", StaticFiles(directory=PROVISION_ROOT), name="provision")


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.app_name}


@app.get("/api/server-info")
def server_info():
    from services.tftp_service import get_tftp_status
    from services.ftp_service import get_ftp_status
    return {
        "tftp": get_tftp_status(),
        "ftp": get_ftp_status(),
        "http_provision_port": settings.http_provision_port,
        "poll_interval": settings.poll_interval_seconds,
    }


# WebSocket endpoint for real-time status
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_ws.append(websocket)
    try:
        # Send current statuses immediately on connect
        await websocket.send_text(json.dumps({
            "type": "statuses",
            "data": list(latest_statuses.values()),
        }))
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connected_ws.remove(websocket)


async def broadcast_status():
    while True:
        await asyncio.sleep(10)
        if connected_ws and latest_statuses:
            message = json.dumps({
                "type": "statuses",
                "data": list(latest_statuses.values()),
            })
            dead = []
            for ws in connected_ws:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                connected_ws.remove(ws)


# Serve React frontend in production
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        index = os.path.join(frontend_dist, "index.html")
        return FileResponse(index)
