from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# Auth
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str = "viewer"


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class LoginRequest(BaseModel):
    username: str
    password: str


# Groups
class GroupCreate(BaseModel):
    name: str
    description: str = ""


class GroupOut(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime

    class Config:
        from_attributes = True


# Devices
class DeviceCreate(BaseModel):
    name: str
    ip: str
    mac: str
    model: str = "GRP2602P"
    group_id: Optional[int] = None
    snmp_community: str = "public"
    admin_user: str = "admin"
    admin_password: str = "admin"
    location: str = ""
    notes: str = ""


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    ip: Optional[str] = None
    mac: Optional[str] = None
    model: Optional[str] = None
    group_id: Optional[int] = None
    snmp_community: Optional[str] = None
    admin_user: Optional[str] = None
    admin_password: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class DeviceOut(BaseModel):
    id: int
    name: str
    ip: str
    mac: str
    model: str
    group_id: Optional[int]
    snmp_community: str
    admin_user: str
    location: str
    notes: str
    created_at: datetime
    group: Optional[GroupOut] = None

    class Config:
        from_attributes = True


# Device Status
class DeviceStatusOut(BaseModel):
    id: int
    device_id: int
    timestamp: datetime
    status: str
    uptime: str
    firmware_version: str
    extension: str
    cpu_usage: Optional[float]
    memory_usage: Optional[float]
    sys_descr: str

    class Config:
        from_attributes = True


# Phonebook
class PhonebookEntryCreate(BaseModel):
    first_name: str
    last_name: str = ""
    phone: str
    account_type: str = "SIP"
    department: str = ""


class PhonebookEntryOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: str
    account_type: str
    department: str
    created_at: datetime

    class Config:
        from_attributes = True


# Firmware
class FirmwareFileOut(BaseModel):
    id: int
    filename: str
    version: str
    model_target: str
    size_bytes: int
    uploaded_at: datetime

    class Config:
        from_attributes = True


# Alerts
class AlertOut(BaseModel):
    id: int
    device_id: int
    rule_type: str
    severity: str
    message: str
    triggered_at: datetime
    resolved_at: Optional[datetime]
    acknowledged: bool

    class Config:
        from_attributes = True


class AlertRuleCreate(BaseModel):
    name: str
    rule_type: str
    device_id: Optional[int] = None
    group_id: Optional[int] = None
    threshold: Optional[float] = None
    notify_email: str = ""


class AlertRuleOut(BaseModel):
    id: int
    name: str
    rule_type: str
    device_id: Optional[int]
    group_id: Optional[int]
    threshold: Optional[float]
    notify_email: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Config Backup
class ConfigBackupOut(BaseModel):
    id: int
    device_id: int
    filename: str
    created_at: datetime

    class Config:
        from_attributes = True


# Push requests
class PushRequest(BaseModel):
    device_ids: List[int]
    protocol: str = "http"  # http | tftp | ftp


class FirmwarePushRequest(BaseModel):
    device_ids: List[int]
    firmware_id: int
    protocol: str = "http"
