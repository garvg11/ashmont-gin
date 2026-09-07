"""Static server for local development.

    python serve.py            # port 5173
    python serve.py 5178       # custom port

Binds to every interface so you can open the site on a phone on the same
Wi-Fi. The LAN address is printed on start.
"""
import http.server
import socket
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".woff2": "font/woff2",
        ".svg": "image/svg+xml",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass


def lan_ip():
    """Best guess at this machine's address on the local network."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))  # never actually sends anything
        return s.getsockname()[0]
    except Exception:
        return None
    finally:
        s.close()


class Server(http.server.ThreadingHTTPServer):
    # Threading matters: a single-threaded server blocks every other client
    # while one browser holds a keep-alive connection, which makes testing
    # on a phone while the desktop tab is open look like a dead server.
    allow_reuse_address = True
    daemon_threads = True


with Server(("0.0.0.0", PORT), Handler) as httpd:
    ip = lan_ip()
    print("\n  Ashmont Gin")
    print(f"  this machine   http://localhost:{PORT}")
    if ip:
        print(f"  same Wi-Fi     http://{ip}:{PORT}")
    print("\n  Ctrl+C to stop.\n")
    httpd.serve_forever()
