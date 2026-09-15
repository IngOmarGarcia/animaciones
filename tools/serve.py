"""Servidor local sin caché para probar el sitio.

Uso (desde la carpeta del proyecto):  python tools/serve.py        → http://localhost:8080
Otro puerto:                          python tools/serve.py 3000

`python -m http.server` no manda cabeceras de caché y el navegador puede seguir usando
módulos JS viejos (por ejemplo un util.js anterior) y dejar animaciones en negro.
"""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    handler = partial(NoCacheHandler, directory=root)
    print(f"Sirviendo {root} en http://localhost:{port} (sin caché)")
    ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()
