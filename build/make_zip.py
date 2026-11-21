"""把查询器（目录版）打包成 zip。

用法: python3 build/make_zip.py
产出: dist/mc-item-finder.zip
"""
import os, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'dist', 'mc-item-finder.zip')

TOP_FILES = ['index.html', 'style.css', 'core.js', 'app.js', 'README.md', '.nomedia']
DIRS = ['data', 'assets']
BUILD_FILES = ['fetch-data.mjs', 'fetch-rest.mjs', 'fetch-extra.mjs', 'fetch-jar.mjs',
               'fetch-mcmeta-lang.mjs', 'resolve-icons.py', 'build_data.py', 'standalone.py', 'make_zip.py']


def add(z, arc, path):
    z.write(path, 'mc-item-finder/' + arc)


os.makedirs(os.path.dirname(OUT), exist_ok=True)
n = 0
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for f in TOP_FILES:
        p = os.path.join(ROOT, f)
        if os.path.isfile(p):
            add(z, f, p); n += 1
    for d in DIRS:
        for base, _, files in os.walk(os.path.join(ROOT, d)):
            for f in sorted(files):
                p = os.path.join(base, f)
                add(z, os.path.relpath(p, ROOT).replace(os.sep, '/'), p); n += 1
    for f in BUILD_FILES:
        p = os.path.join(ROOT, 'build', f)
        if os.path.isfile(p):
            add(z, 'build/' + f, p); n += 1

print('zip:', OUT, round(os.path.getsize(OUT) / 1048576, 2), 'MB', '文件', n)
