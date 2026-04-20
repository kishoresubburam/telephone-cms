from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "Telephone CMS"
    secret_key: str = "change-me-in-production-use-a-long-random-string"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    database_url: str = "sqlite:///./cms.db"

    snmp_community: str = "public"
    snmp_port: int = 161
    snmp_timeout: int = 5
    poll_interval_seconds: int = 60

    tftp_host: str = "0.0.0.0"
    tftp_port: int = 6969
    tftp_root: str = "provisioning"

    ftp_host: str = "0.0.0.0"
    ftp_port: int = 2121
    ftp_user: str = "telcms"
    ftp_password: str = "telcms_ftp_pass"
    ftp_root: str = "provisioning"

    http_provision_port: int = 8000

    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from: Optional[str] = None

    class Config:
        env_file = ".env"


settings = Settings()
