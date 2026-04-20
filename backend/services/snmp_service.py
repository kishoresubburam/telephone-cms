import asyncio
from datetime import datetime

# Standard OIDs
OID_SYS_DESCR = "1.3.6.1.2.1.1.1.0"
OID_SYS_UPTIME = "1.3.6.1.2.1.1.3.0"
OID_SYS_NAME = "1.3.6.1.2.1.1.5.0"

# Grandstream enterprise OIDs (GRP/GXV series)
OID_GS_FIRMWARE = "1.3.6.1.4.1.21529.1.1.3.0"
OID_GS_EXTENSION = "1.3.6.1.4.1.21529.1.1.4.0"


async def _snmp_get_async(ip: str, community: str, port: int, oid: str, timeout: int = 5):
    from pysnmp.hlapi.v3arch.asyncio import (
        get_cmd, SnmpEngine, CommunityData, UdpTransportTarget,
        ContextData, ObjectType, ObjectIdentity,
    )
    try:
        engine = SnmpEngine()
        error_indication, error_status, _, var_binds = await get_cmd(
            engine,
            CommunityData(community, mpModel=0),
            await UdpTransportTarget.create((ip, port), timeout=timeout, retries=1),
            ContextData(),
            ObjectType(ObjectIdentity(oid)),
        )
        engine.close_dispatcher()
        if error_indication or error_status:
            return None
        for var_bind in var_binds:
            return str(var_bind[1])
    except Exception:
        return None
    return None


def _snmp_get_sync(ip: str, community: str, port: int, oid: str, timeout: int = 5):
    try:
        loop = asyncio.new_event_loop()
        result = loop.run_until_complete(_snmp_get_async(ip, community, port, oid, timeout))
        loop.close()
        return result
    except Exception:
        return None


def poll_device(ip: str, community: str = "public", port: int = 161) -> dict:
    result = {
        "status": "offline",
        "uptime": "",
        "firmware_version": "",
        "extension": "",
        "cpu_usage": None,
        "memory_usage": None,
        "sys_descr": "",
        "timestamp": datetime.utcnow().isoformat(),
    }
    try:
        sys_descr = _snmp_get_sync(ip, community, port, OID_SYS_DESCR)
        if sys_descr is None:
            return result

        result["status"] = "online"
        result["sys_descr"] = sys_descr or ""

        uptime = _snmp_get_sync(ip, community, port, OID_SYS_UPTIME)
        result["uptime"] = _format_uptime(uptime) if uptime else ""

        firmware = _snmp_get_sync(ip, community, port, OID_GS_FIRMWARE)
        result["firmware_version"] = firmware or ""

        extension = _snmp_get_sync(ip, community, port, OID_GS_EXTENSION)
        result["extension"] = extension or ""

    except Exception:
        result["status"] = "offline"

    return result


def _format_uptime(ticks_str: str) -> str:
    try:
        ticks = int(ticks_str)
        seconds = ticks // 100
        days = seconds // 86400
        hours = (seconds % 86400) // 3600
        minutes = (seconds % 3600) // 60
        return f"{days}d {hours}h {minutes}m"
    except Exception:
        return ticks_str
