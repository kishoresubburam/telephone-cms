import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_user, require_admin
from services import http_provision
from config import settings

router = APIRouter(prefix="/api/config-backup", tags=["config_backup"])

BACKUP_DIR = os.path.join(settings.tftp_root, "backups")


@router.get("/{device_id}", response_model=list[schemas.ConfigBackupOut])
def list_backups(device_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return (
        db.query(models.ConfigBackup)
        .filter(models.ConfigBackup.device_id == device_id)
        .order_by(models.ConfigBackup.created_at.desc())
        .all()
    )


@router.post("/{device_id}/backup", response_model=schemas.ConfigBackupOut)
async def backup_device(device_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    content = await http_provision.backup_config_http(device.ip, device.admin_user, device.admin_password)
    if content is None:
        raise HTTPException(status_code=502, detail="Failed to retrieve config from device")

    os.makedirs(BACKUP_DIR, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"cfg_{device.mac.replace(':', '')}_{ts}.txt"
    path = os.path.join(BACKUP_DIR, filename)
    with open(path, "wb") as f:
        f.write(content)

    backup = models.ConfigBackup(device_id=device.id, filename=filename, path=path)
    db.add(backup)
    db.commit()
    db.refresh(backup)
    return backup


@router.get("/download/{backup_id}")
def download_backup(backup_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    backup = db.query(models.ConfigBackup).filter(models.ConfigBackup.id == backup_id).first()
    if not backup or not os.path.exists(backup.path):
        raise HTTPException(status_code=404, detail="Backup not found")
    return FileResponse(backup.path, filename=backup.filename)


@router.delete("/{backup_id}")
def delete_backup(backup_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    backup = db.query(models.ConfigBackup).filter(models.ConfigBackup.id == backup_id).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
    if os.path.exists(backup.path):
        os.remove(backup.path)
    db.delete(backup)
    db.commit()
    return {"message": "Backup deleted"}
