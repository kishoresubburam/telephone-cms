import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_user, require_admin
from services import http_provision
from config import settings

router = APIRouter(prefix="/api/firmware", tags=["firmware"])

FIRMWARE_DIR = os.path.join(settings.tftp_root, "firmware")


@router.get("", response_model=list[schemas.FirmwareFileOut])
def list_firmware(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.FirmwareFile).order_by(models.FirmwareFile.uploaded_at.desc()).all()


@router.post("/upload", response_model=schemas.FirmwareFileOut)
async def upload_firmware(
    file: UploadFile = File(...),
    version: str = Form(""),
    model_target: str = Form("GRP2602P"),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    os.makedirs(FIRMWARE_DIR, exist_ok=True)
    dest = os.path.join(FIRMWARE_DIR, file.filename)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    size = os.path.getsize(dest)
    fw = models.FirmwareFile(
        filename=file.filename,
        version=version,
        model_target=model_target,
        path=dest,
        size_bytes=size,
    )
    db.add(fw)
    db.commit()
    db.refresh(fw)
    return fw


@router.delete("/{firmware_id}")
def delete_firmware(firmware_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    fw = db.query(models.FirmwareFile).filter(models.FirmwareFile.id == firmware_id).first()
    if not fw:
        raise HTTPException(status_code=404, detail="Firmware not found")
    if os.path.exists(fw.path):
        os.remove(fw.path)
    db.delete(fw)
    db.commit()
    return {"message": "Firmware deleted"}


@router.post("/push")
async def push_firmware(
    req: schemas.FirmwarePushRequest,
    request: Request,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    fw = db.query(models.FirmwareFile).filter(models.FirmwareFile.id == req.firmware_id).first()
    if not fw:
        raise HTTPException(status_code=404, detail="Firmware not found")

    base_url = f"http://{request.base_url.hostname}:{settings.http_provision_port}"
    results = []

    for device_id in req.device_ids:
        device = db.query(models.Device).filter(models.Device.id == device_id).first()
        if not device:
            continue

        success = False
        if req.protocol == "http":
            firmware_url = f"{base_url}/provision/firmware/{fw.filename}"
            success = await http_provision.push_firmware_http(
                device.ip, device.admin_user, device.admin_password, firmware_url
            )
        elif req.protocol in ("tftp", "ftp"):
            success = True  # file already served via built-in TFTP/FTP

        results.append({"device_id": device_id, "device_name": device.name, "success": success})

    return {"firmware": fw.filename, "results": results}


@router.get("/download/{filename}")
def download_firmware(filename: str, _=Depends(get_current_user)):
    path = os.path.join(FIRMWARE_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=filename)
