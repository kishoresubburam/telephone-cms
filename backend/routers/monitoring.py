from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_user
from services.snmp_service import poll_device
from services.scheduler import latest_statuses
from config import settings

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])


@router.get("/status", response_model=list[dict])
def get_all_statuses(_=Depends(get_current_user)):
    return list(latest_statuses.values())


@router.get("/summary")
def get_summary(db: Session = Depends(get_db), _=Depends(get_current_user)):
    total = db.query(models.Device).count()
    online = sum(1 for s in latest_statuses.values() if s.get("status") == "online")
    offline = sum(1 for s in latest_statuses.values() if s.get("status") == "offline")
    unpolled = total - len(latest_statuses)
    active_alerts = db.query(models.Alert).filter(
        models.Alert.resolved_at == None,
        models.Alert.acknowledged == False,
    ).count()
    return {
        "total": total,
        "online": online,
        "offline": offline,
        "unpolled": unpolled,
        "active_alerts": active_alerts,
    }


@router.get("/devices/{device_id}/status", response_model=list[schemas.DeviceStatusOut])
def get_device_history(
    device_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return (
        db.query(models.DeviceStatus)
        .filter(models.DeviceStatus.device_id == device_id)
        .order_by(models.DeviceStatus.timestamp.desc())
        .limit(limit)
        .all()
    )


@router.post("/devices/{device_id}/poll")
def poll_now(device_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
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
    db.commit()
    latest_statuses[device.id] = {
        "device_id": device.id,
        "device_name": device.name,
        "device_ip": device.ip,
        "device_model": device.model,
        **data,
    }
    return data
