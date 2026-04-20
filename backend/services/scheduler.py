import logging
import asyncio
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from services.snmp_service import poll_device
from services.alert_service import evaluate_alerts
from config import settings

logger = logging.getLogger(__name__)
_scheduler = BackgroundScheduler()

# In-memory cache of latest status for WebSocket broadcast
latest_statuses: dict = {}
ws_broadcast_queue: asyncio.Queue = None


def set_broadcast_queue(q: asyncio.Queue):
    global ws_broadcast_queue
    ws_broadcast_queue = q


def poll_all_devices():
    db: Session = SessionLocal()
    try:
        devices = db.query(models.Device).all()
        for device in devices:
            try:
                data = poll_device(device.ip, device.snmp_community, settings.snmp_port)
                status_record = models.DeviceStatus(
                    device_id=device.id,
                    status=data["status"],
                    uptime=data.get("uptime", ""),
                    firmware_version=data.get("firmware_version", ""),
                    extension=data.get("extension", ""),
                    cpu_usage=data.get("cpu_usage"),
                    memory_usage=data.get("memory_usage"),
                    sys_descr=data.get("sys_descr", ""),
                )
                db.add(status_record)

                latest_statuses[device.id] = {
                    "device_id": device.id,
                    "device_name": device.name,
                    "device_ip": device.ip,
                    "device_model": device.model,
                    **data,
                }

                evaluate_alerts(db, device, data)
                db.commit()

            except Exception as e:
                logger.error(f"Error polling device {device.ip}: {e}")
    finally:
        db.close()


def start_scheduler():
    _scheduler.add_job(
        poll_all_devices,
        "interval",
        seconds=settings.poll_interval_seconds,
        id="snmp_poll",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(f"Scheduler started, polling every {settings.poll_interval_seconds}s")


def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown()
