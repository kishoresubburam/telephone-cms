from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
import models
import schemas
from auth import get_current_user, require_admin

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=list[schemas.AlertOut])
def list_alerts(
    unresolved_only: bool = False,
    device_id: int = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(models.Alert)
    if unresolved_only:
        q = q.filter(models.Alert.resolved_at == None)
    if device_id:
        q = q.filter(models.Alert.device_id == device_id)
    return q.order_by(models.Alert.triggered_at.desc()).limit(limit).all()


@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.acknowledged = True
    db.commit()
    return {"message": "Alert acknowledged"}


@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.resolved_at = datetime.utcnow()
    db.commit()
    return {"message": "Alert resolved"}


# Alert Rules
@router.get("/rules", response_model=list[schemas.AlertRuleOut])
def list_rules(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.AlertRule).all()


@router.post("/rules", response_model=schemas.AlertRuleOut)
def create_rule(rule_in: schemas.AlertRuleCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    rule = models.AlertRule(**rule_in.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.put("/rules/{rule_id}/toggle")
def toggle_rule(rule_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    rule = db.query(models.AlertRule).filter(models.AlertRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule.is_active = not rule.is_active
    db.commit()
    return {"rule_id": rule_id, "is_active": rule.is_active}


@router.delete("/rules/{rule_id}")
def delete_rule(rule_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    rule = db.query(models.AlertRule).filter(models.AlertRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()
    return {"message": "Rule deleted"}
