#!/usr/bin/env python3
"""
Local dev server.

Reads the rewrites and cleanUrls setting straight out of vercel.json, so
local routing matches production instead of drifting from it. Plain
`python3 -m http.server` 404s on /work/lemfi and every extensionless link,
which makes the site look broken locally when it is fine when deployed.

    python3 serve.py [port]
"""

import json
import os
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))


def load_config():
    """Turn vercel.json's rewrites into (regex, destination) pairs."""
    try:
        with open(os.path.join(ROOT, "vercel.json")) as fh:
            cfg = json.load(fh)
    except (OSError, ValueError) as err:
        print(f"could not read vercel.json ({err}); serving files as-is")
        return [], False

    rewrites = []
    for rule in cfg.get("rewrites", []):
        # Vercel's ":param" matches a single path segment
        pattern = re.sub(r":[A-Za-z_][A-Za-z0-9_]*", "[^/]+", rule["source"])
        rewrites.append((re.compile("^" + pattern + "/?$"), rule["destination"]))
    return rewrites, bool(cfg.get("cleanUrls"))


REWRITES, CLEAN_URLS = load_config()


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        clean = path.split("?", 1)[0].split("#", 1)[0]

        for pattern, destination in REWRITES:
            if pattern.match(clean):
                path = destination
                break

        resolved = super().translate_path(path)
        if CLEAN_URLS and not os.path.exists(resolved):
            if os.path.exists(resolved + ".html"):
                return resolved + ".html"
        return resolved

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4321
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", port), partial(Handler))
    print(f"serving http://localhost:{port}")
    print(f"  rewrites: {len(REWRITES)}   cleanUrls: {CLEAN_URLS}")
    server.serve_forever()
