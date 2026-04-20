import threading
import logging
import os
from pyftpdlib.handlers import FTPHandler
from pyftpdlib.servers import FTPServer
from pyftpdlib.authorizers import DummyAuthorizer
from config import settings

logger = logging.getLogger(__name__)
_ftp_server: FTPServer = None
_ftp_thread: threading.Thread = None


def start_ftp_server():
    global _ftp_server, _ftp_thread
    root = os.path.abspath(settings.ftp_root)
    os.makedirs(root, exist_ok=True)

    authorizer = DummyAuthorizer()
    authorizer.add_user(settings.ftp_user, settings.ftp_password, root, perm="elradfmwMT")
    authorizer.add_anonymous(root, perm="elr")

    handler = FTPHandler
    handler.authorizer = authorizer
    handler.passive_ports = range(60000, 60100)
    handler.banner = "Telephone CMS FTP Server"

    _ftp_server = FTPServer((settings.ftp_host, settings.ftp_port), handler)
    _ftp_server.max_cons = 50

    def _run():
        try:
            logger.info(f"FTP server starting on {settings.ftp_host}:{settings.ftp_port} root={root}")
            _ftp_server.serve_forever()
        except Exception as e:
            logger.error(f"FTP server error: {e}")

    _ftp_thread = threading.Thread(target=_run, daemon=True)
    _ftp_thread.start()


def stop_ftp_server():
    global _ftp_server
    if _ftp_server:
        try:
            _ftp_server.close_all()
        except Exception:
            pass


def get_ftp_status() -> dict:
    return {
        "running": _ftp_thread is not None and _ftp_thread.is_alive(),
        "host": settings.ftp_host,
        "port": settings.ftp_port,
        "root": settings.ftp_root,
        "user": settings.ftp_user,
    }
