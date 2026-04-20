import httpx
import logging
import base64
from config import settings

logger = logging.getLogger(__name__)


async def push_phonebook_http(ip: str, admin_user: str, admin_password: str, provision_url: str) -> bool:
    """Tell the device to re-provision its phonebook via HTTP."""
    try:
        auth = base64.b64encode(f"{admin_user}:{admin_password}".encode()).decode()
        headers = {"Authorization": f"Basic {auth}"}
        # Grandstream devices: POST to set the provisioning server URL then trigger resync
        payload = {
            "P212": provision_url,  # Phonebook XML URL
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"http://{ip}/cgi-bin/api.values.post",
                data=payload,
                headers=headers,
            )
            if resp.status_code in (200, 302):
                logger.info(f"Phonebook push OK to {ip}")
                return True
            logger.warning(f"Phonebook push to {ip} returned {resp.status_code}")
            return False
    except Exception as e:
        logger.error(f"Phonebook push HTTP error to {ip}: {e}")
        return False


async def push_firmware_http(ip: str, admin_user: str, admin_password: str, firmware_url: str) -> bool:
    """Trigger firmware upgrade on Grandstream device via HTTP admin API."""
    try:
        auth = base64.b64encode(f"{admin_user}:{admin_password}".encode()).decode()
        headers = {"Authorization": f"Basic {auth}"}
        payload = {
            "P192": "1",             # Firmware upgrade via TFTP/HTTP
            "P238": firmware_url,    # Firmware server path
        }
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"http://{ip}/cgi-bin/api.upgrade.post",
                data=payload,
                headers=headers,
            )
            return resp.status_code in (200, 302)
    except Exception as e:
        logger.error(f"Firmware push HTTP error to {ip}: {e}")
        return False


async def backup_config_http(ip: str, admin_user: str, admin_password: str) -> bytes | None:
    """Download device config backup via HTTP."""
    try:
        auth = base64.b64encode(f"{admin_user}:{admin_password}".encode()).decode()
        headers = {"Authorization": f"Basic {auth}"}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"http://{ip}/cgi-bin/api.values.get",
                headers=headers,
            )
            if resp.status_code == 200:
                return resp.content
    except Exception as e:
        logger.error(f"Config backup HTTP error from {ip}: {e}")
    return None


async def reboot_device_http(ip: str, admin_user: str, admin_password: str) -> bool:
    """Reboot Grandstream device via HTTP admin API."""
    try:
        auth = base64.b64encode(f"{admin_user}:{admin_password}".encode()).decode()
        headers = {"Authorization": f"Basic {auth}"}
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"http://{ip}/cgi-bin/api.values.post",
                data={"request": "REBOOT"},
                headers=headers,
            )
            return resp.status_code in (200, 302)
    except Exception as e:
        logger.error(f"Reboot HTTP error for {ip}: {e}")
        return False
