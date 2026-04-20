from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models
import schemas
from auth import get_current_user, require_admin
from services import http_provision

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("", response_model=list[schemas.DeviceOut])
def list_devices(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(models.Device)
    if group_id:
        q = q.filter(models.Device.group_id == group_id)
    return q.all()


@router.post("", response_model=schemas.DeviceOut)
def create_device(device_in: schemas.DeviceCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(models.Device).filter(models.Device.ip == device_in.ip).first():
        raise HTTPException(status_code=400, detail="IP already registered")
    if db.query(models.Device).filter(models.Device.mac == device_in.mac).first():
        raise HTTPException(status_code=400, detail="MAC already registered")
    device = models.Device(**device_in.model_dump())
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.get("/{device_id}", response_model=schemas.DeviceOut)
def get_device(device_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.put("/{device_id}", response_model=schemas.DeviceOut)
def update_device(device_id: int, device_in: schemas.DeviceUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    for field, value in device_in.model_dump(exclude_unset=True).items():
        setattr(device, field, value)
    db.commit()
    db.refresh(device)
    return device


@router.delete("/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    db.delete(device)
    db.commit()
    return {"message": "Device deleted"}


@router.post("/{device_id}/reboot")
async def reboot_device(device_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    ok = await http_provision.reboot_device_http(device.ip, device.admin_user, device.admin_password)
    return {"success": ok, "device": device.name}
