#!/usr/bin/env python3
"""Compatibility entry point for the site server, including the Sanity API.

    npm ci && npm run build
    python3 serve.py [port]

The shared Node server reads routes from vercel.json and runs api/posts.js,
so local blog behavior matches production without duplicating API logic.
"""
import os
import sys
from pathlib import Path

if __name__ == '__main__':
    os.chdir(Path(__file__).resolve().parent)
    os.environ['PORT'] = sys.argv[1] if len(sys.argv) > 1 else '4321'
    os.execvp('node', ['node', 'scripts/dev.mjs'])
