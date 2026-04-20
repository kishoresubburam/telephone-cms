from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_user, require_admin

router = APIRouter(prefix="/api/groups", tags=["groups"])


@router.get("", response_model=list[schemas.GroupOut])
def list_groups(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.Group).all()


@router.post("", response_model=schemas.GroupOut)
def create_group(group_in: schemas.GroupCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(models.Group).filter(models.Group.name == group_in.name).first():
        raise HTTPException(status_code=400, detail="Group name already exists")
    group = models.Group(**group_in.model_dump())
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@router.get("/{group_id}", response_model=schemas.GroupOut)
def get_group(group_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


@router.put("/{group_id}", response_model=schemas.GroupOut)
def update_group(group_id: int, group_in: schemas.GroupCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    group.name = group_in.name
    group.description = group_in.description
    db.commit()
    db.refresh(group)
    return group


@router.delete("/{group_id}")
def delete_group(group_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    db.delete(group)
    db.commit()
    return {"message": "Group deleted"}
