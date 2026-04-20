import threading
import logging
import os
import tftpy
from config import settings

logger = logging.getLogger(__name__)
_tftp_server: tftpy.TftpServer = None
_tftp_thread: threading.Thread = None


def start_tftp_server():
    global _tftp_server, _tftp_thread
    root = os.path.abspath(settings.tftp_root)
    os.makedirs(root, exist_ok=True)
    _tftp_server = tftpy.TftpServer(root)

    def _run():
        try:
            logger.info(f"TFTP server starting on {settings.tftp_host}:{settings.tftp_port} root={root}")
            _tftp_server.listen(settings.tftp_host, settings.tftp_port)
        except Exception as e:
            logger.error(f"TFTP server error: {e}")

    _tftp_thread = threading.Thread(target=_run, daemon=True)
    _tftp_thread.start()


def stop_tftp_server():
    global _tftp_server
    if _tftp_server:
        try:
            _tftp_server.stop()
        except Exception:
            pass


def get_tftp_status() -> dict:
    return {
        "running": _tftp_thread is not None and _tftp_thread.is_alive(),
        "host": settings.tftp_host,
        "port": settings.tftp_port,
        "root": settings.tftp_root,
    }
