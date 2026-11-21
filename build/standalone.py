"""把整个查询器打包成单个 HTML 文件（图标转 base64 内联，离线可用）。

用法: python3 build/standalone.py
产出: dist/mc-item-finder.html
"""
import base64, glob, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
os.makedirs(DIST, exist_ok=True)

def read(*p):
    with open(os.path.join(ROOT, *p), encoding='utf-8') as f:
        return f.read()

def js_safe(txt):
    """放到 <script> 里时避免提前闭合标签"""
    return txt.replace('</', '<\\/')

html = read('index.html')
css = read('style.css')
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>')

# 图标 → data URI
icons = {}
for f in sorted(glob.glob(os.path.join(ROOT, 'assets/icons/**/*.png'), recursive=True)):
    rel = os.path.relpath(f, os.path.join(ROOT, 'assets/icons')).replace(os.sep, '/')
    with open(f, 'rb') as fp:
        icons[rel] = 'data:image/png;base64,' + base64.b64encode(fp.read()).decode()

parts = ['window.MCQ_ICONS=' + js_safe(json.dumps(icons, ensure_ascii=False, separators=(',', ':'))) + ';']
parts.append(read('core.js'))
parts.append(read(os.path.join('data', 'meta.js')))
for f in sorted(glob.glob(os.path.join(ROOT, 'data', 'items-*.js')) + glob.glob(os.path.join(ROOT, 'data', 'be-items-*.js'))):
    parts.append(open(f, encoding='utf-8').read())
for f in sorted(glob.glob(os.path.join(ROOT, 'data', 'lang-*.js'))):
    parts.append(open(f, encoding='utf-8').read())
parts.append(read('app.js'))
bundle = '<script>\n' + js_safe('\n'.join(parts)) + '\n</script>'

for tag in ('<script src="core.js"></script>', '<script src="data/meta.js"></script>', '<script src="app.js"></script>'):
    html = html.replace(tag, '')
html = html.replace('</body>', bundle + '\n</body>')

out = os.path.join(DIST, 'mc-item-finder.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
print('单文件版:', out, round(os.path.getsize(out) / 1048576, 2), 'MB',
      '图标', len(icons), '张')
