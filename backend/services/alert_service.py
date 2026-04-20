import logging
import smtplib
from email.mime.text import MIMEText
from datetime import datetime
from sqlalchemy.orm import Session
import models
from config import settings

logger = logging.getLogger(__name__)


def evaluate_alerts(db: Session, device: models.Device, status_data: dict):
    rules = db.query(models.AlertRule).filter(
        models.AlertRule.is_active == True
    ).all()

    for rule in rules:
        if rule.device_id and rule.device_id != device.id:
            continue
        if rule.group_id and device.group_id != rule.group_id:
            continue
        _check_rule(db, device, status_data, rule)


def _check_rule(db: Session, device: models.Device, status_data: dict, rule: models.AlertRule):
    triggered = False
    message = ""

    if rule.rule_type == "offline" and status_data.get("status") == "offline":
        triggered = True
        message = f"Device {device.name} ({device.ip}) is offline"

    elif rule.rule_type == "high_cpu":
        cpu = status_data.get("cpu_usage")
        threshold = rule.threshold or 90.0
        if cpu is not None and cpu > threshold:
            triggered = True
            message = f"Device {device.name} CPU usage {cpu:.1f}% exceeds threshold {threshold}%"

    elif rule.rule_type == "high_memory":
        mem = status_data.get("memory_usage")
        threshold = rule.threshold or 90.0
        if mem is not None and mem > threshold:
            triggered = True
            message = f"Device {device.name} memory usage {mem:.1f}% exceeds threshold {threshold}%"

    if not triggered:
        _resolve_existing_alert(db, device.id, rule.rule_type)
        return

    existing = db.query(models.Alert).filter(
        models.Alert.device_id == device.id,
        models.Alert.rule_type == rule.rule_type,
        models.Alert.resolved_at == None,
    ).first()

    if not existing:
        alert = models.Alert(
            device_id=device.id,
            rule_type=rule.rule_type,
            severity="critical" if rule.rule_type == "offline" else "warning",
            message=message,
        )
        db.add(alert)
        db.commit()
        logger.warning(f"Alert triggered: {message}")
        if rule.notify_email:
            _send_email(rule.notify_email, f"[CMS Alert] {rule.rule_type}", message)


def _resolve_existing_alert(db: Session, device_id: int, rule_type: str):
    alert = db.query(models.Alert).filter(
        models.Alert.device_id == device_id,
        models.Alert.rule_type == rule_type,
        models.Alert.resolved_at == None,
    ).first()
    if alert:
        alert.resolved_at = datetime.utcnow()
        db.commit()


def _send_email(to: str, subject: str, body: str):
    if not settings.smtp_host or not settings.smtp_user:
        return
    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from or settings.smtp_user
        msg["To"] = to
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
    except Exception as e:
        logger.error(f"Failed to send alert email: {e}")
