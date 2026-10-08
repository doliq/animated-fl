#!/usr/bin/env python3
"""
Server pratinjau untuk pengembangan (bukan untuk GitHub Pages).

Bedanya dengan `python -m http.server` biasa:
  - mengirim header Cache-Control: no-store, sehingga browser SELALU mengambil
    berkas terbaru. Tanpa ini, Chrome/Firefox suka memakai salinan lama
    (HTML/CSS/JS terlihat tidak berubah walau file sudah diedit).
  - mendukung rentang byte (range request), jadi video di assets/video bisa
    diputar dan digeser sebelum terunduh penuh, seperti di hosting sungguhan.

Pakai:
  python _dev/serve.py            # port 8765
  python _dev/serve.py 8080       # port lain
Lalu buka http://127.0.0.1:8765/
"""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class _Slice(object):
    """Pembungkus berkas yang hanya mengalirkan sejumlah byte tertentu."""

    def __init__(self, fp, remaining):
        self.fp = fp
        self.remaining = remaining

    def read(self, size=-1):
        if self.remaining <= 0:
            return b''
        if size is None or size < 0 or size > self.remaining:
            size = self.remaining
        data = self.fp.read(size)
        self.remaining -= len(data)
        return data

    def close(self):
        try:
            self.fp.close()
        except Exception:
            pass


class PreviewHandler(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def send_head(self):
        path = self.translate_path(self.path)
        rng = self.headers.get('Range')
        if not rng or not os.path.isfile(path):
            return super().send_head()
        try:
            unit, _, spec = rng.partition('=')
            if unit.strip().lower() != 'bytes':
                return super().send_head()
            first, _, last = spec.partition('-')
            size = os.path.getsize(path)
            if first:
                start = int(first)
                end = int(last) if last else size - 1
            else:                       # bentuk "-500" = 500 byte terakhir
                start = max(0, size - int(last))
                end = size - 1
            end = min(end, size - 1)
            if start > end or start >= size:
                self.send_response(416)
                self.send_header('Content-Range', 'bytes */%d' % size)
                self.send_header('Content-Length', '0')
                self.end_headers()
                return None
            fp = open(path, 'rb')
            fp.seek(start)
            self.send_response(206)
            self.send_header('Content-Type', self.guess_type(path))
            self.send_header('Content-Range', 'bytes %d-%d/%d' % (start, end, size))
            self.send_header('Content-Length', str(end - start + 1))
            self.end_headers()
            return _Slice(fp, end - start + 1)
        except Exception:
            return super().send_head()

    def log_message(self, fmt, *args):
        sys.stderr.write('%s - %s\n' % (self.address_string(), fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    handler = partial(PreviewHandler, directory=ROOT)
    httpd = ThreadingHTTPServer(('127.0.0.1', port), handler)
    print('Pratinjau jalan di http://127.0.0.1:%d/   (Ctrl+C untuk berhenti)' % port)
    print('Akar folder: %s' % ROOT)
    print('Cache dimatikan: setiap refresh selalu mengambil berkas terbaru.')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nBerhenti.')


if __name__ == '__main__':
    main()
