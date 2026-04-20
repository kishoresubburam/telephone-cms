import os
import csv
import io
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_user, require_admin
from services import http_provision
from config import settings

router = APIRouter(prefix="/api/phonebook", tags=["phonebook"])


def generate_xml(entries: list) -> str:
    root = Element("AddressBook")
    for e in entries:
        contact = SubElement(root, "Contact")
        SubElement(contact, "FirstName").text = e.first_name
        SubElement(contact, "LastName").text = e.last_name or ""
        SubElement(contact, "Department").text = e.department or ""
        phone_el = SubElement(contact, "Phone")
        SubElement(phone_el, "phonenumber").text = e.phone
        SubElement(phone_el, "accountindex").text = "0"
    raw = tostring(root, encoding="unicode")
    parsed = minidom.parseString(raw)
    return parsed.toprettyxml(indent="  ")


@router.get("", response_model=list[schemas.PhonebookEntryOut])
def list_entries(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.PhonebookEntry).all()


@router.post("", response_model=schemas.PhonebookEntryOut)
def create_entry(entry_in: schemas.PhonebookEntryCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    entry = models.PhonebookEntry(**entry_in.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.put("/{entry_id}", response_model=schemas.PhonebookEntryOut)
def update_entry(entry_id: int, entry_in: schemas.PhonebookEntryCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    entry = db.query(models.PhonebookEntry).filter(models.PhonebookEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    for field, value in entry_in.model_dump().items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    entry = db.query(models.PhonebookEntry).filter(models.PhonebookEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted"}


@router.post("/import-csv")
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db), _=Depends(require_admin)):
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    added = 0
    for row in reader:
        entry = models.PhonebookEntry(
            first_name=row.get("first_name", row.get("FirstName", "")),
            last_name=row.get("last_name", row.get("LastName", "")),
            phone=row.get("phone", row.get("Phone", "")),
            account_type=row.get("account_type", "SIP"),
            department=row.get("department", row.get("Department", "")),
        )
        if entry.first_name and entry.phone:
            db.add(entry)
            added += 1
    db.commit()
    return {"imported": added}


@router.get("/export-xml")
def export_xml(db: Session = Depends(get_db), _=Depends(get_current_user)):
    entries = db.query(models.PhonebookEntry).all()
    xml_str = generate_xml(entries)
    return Response(content=xml_str, media_type="application/xml")


@router.post("/push")
async def push_phonebook(
    req: schemas.PushRequest,
    request: Request,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    entries = db.query(models.PhonebookEntry).all()
    xml_str = generate_xml(entries)

    # Save XML to provisioning dir
    pb_path = os.path.join(settings.tftp_root, "phonebooks", "phonebook.xml")
    os.makedirs(os.path.dirname(pb_path), exist_ok=True)
    with open(pb_path, "w") as f:
        f.write(xml_str)

    base_url = f"http://{request.base_url.hostname}:{settings.http_provision_port}"
    results = []

    for device_id in req.device_ids:
        device = db.query(models.Device).filter(models.Device.id == device_id).first()
        if not device:
            continue

        success = False
        if req.protocol == "http":
            provision_url = f"{base_url}/provision/phonebooks/phonebook.xml"
            success = await http_provision.push_phonebook_http(
                device.ip, device.admin_user, device.admin_password, provision_url
            )
        elif req.protocol in ("tftp", "ftp"):
            # Device is configured to pull from TFTP/FTP — just ensure file is in place
            success = True

        results.append({"device_id": device_id, "device_name": device.name, "success": success})

    return {"results": results}


# Provision endpoint that devices pull from
@router.get("/provision/{mac}")
def provision_phonebook(mac: str, db: Session = Depends(get_db)):
    entries = db.query(models.PhonebookEntry).all()
    xml_str = generate_xml(entries)
    return Response(content=xml_str, media_type="application/xml")
