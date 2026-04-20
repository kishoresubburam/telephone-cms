from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, Float, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="viewer")  # admin | viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    devices = relationship("Device", back_populates="group")


class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    ip = Column(String, nullable=False, unique=True)
    mac = Column(String, nullable=False, unique=True)
    model = Column(String, default="GRP2602P")  # GRP2602P | GXV
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    snmp_community = Column(String, default="public")
    admin_user = Column(String, default="admin")
    admin_password = Column(String, default="admin")
    location = Column(String, default="")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    group = relationship("Group", back_populates="devices")
    statuses = relationship("DeviceStatus", back_populates="device", cascade="all, delete")
    alerts = relationship("Alert", back_populates="device", cascade="all, delete")
    backups = relationship("ConfigBackup", back_populates="device", cascade="all, delete")


class DeviceStatus(Base):
    __tablename__ = "device_statuses"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="unknown")  # online | offline | warning
    uptime = Column(String, default="")
    firmware_version = Column(String, default="")
    extension = Column(String, default="")
    cpu_usage = Column(Float, nullable=True)
    memory_usage = Column(Float, nullable=True)
    sys_descr = Column(Text, default="")
    device = relationship("Device", back_populates="statuses")


class PhonebookEntry(Base):
    __tablename__ = "phonebook_entries"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, default="")
    phone = Column(String, nullable=False)
    account_type = Column(String, default="SIP")
    department = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class FirmwareFile(Base):
    __tablename__ = "firmware_files"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    version = Column(String, default="")
    model_target = Column(String, default="GRP2602P")
    path = Column(String, nullable=False)
    size_bytes = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=datetime.utcnow)


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    rule_type = Column(String, nullable=False)  # offline | firmware_mismatch | high_cpu
    severity = Column(String, default="warning")  # info | warning | critical
    message = Column(Text, nullable=False)
    triggered_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    acknowledged = Column(Boolean, default=False)
    device = relationship("Device", back_populates="alerts")


class AlertRule(Base):
    __tablename__ = "alert_rules"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    rule_type = Column(String, nullable=False)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    threshold = Column(Float, nullable=True)
    notify_email = Column(String, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ConfigBackup(Base):
    __tablename__ = "config_backups"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    filename = Column(String, nullable=False)
    path = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    device = relationship("Device", back_populates="backups")
