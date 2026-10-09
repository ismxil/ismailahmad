#!/usr/bin/env python3
"""
Local dev server.

Mirrors the rewrites in vercel.json so that clean URLs such as /work/lemfi
resolve the same way they do in production. Plain `python3 -m http.server`
404s on those, which makes the case pages look broken locally.

    python3 serve.py [port]
"""

import os
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# source pattern -> file actually served
REWRITES = [
    (re.compile(r"^/profile/?$"), "/about.html"),
    (re.compile(r"^/work/[^/]+/?$"), "/case.html"),
]


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        clean = path.split("?", 1)[0].split("#", 1)[0]
        for pattern, target in REWRITES:
            if pattern.match(clean):
                return super().translate_path(target)

        resolved = super().translate_path(path)
        # "cleanUrls": true in vercel.json serves /work from work.html. Mirror
        # that here, or every extensionless link 404s locally.
        if not os.path.exists(resolved) and os.path.exists(resolved + ".html"):
            return resolved + ".html"
        return resolved

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4321
    server = ThreadingHTTPServer(("127.0.0.1", port), partial(Handler))
    print(f"serving http://localhost:{port} (with /work/:slug rewrite)")
    server.serve_forever()
