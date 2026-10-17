"""Build the offline design viewer from the shared Figma payload.

Run with Python 3 from any directory. This does not build or modify the app.
"""
from pathlib import Path
import base64
import json
import re

ROOT = Path(__file__).resolve().parent
payload = json.loads((ROOT / "figma-payload.json").read_text(encoding="utf-8"))
token_path = ROOT / "tokens.json"
tokens = json.loads(token_path.read_text(encoding="utf-8")) if token_path.exists() else payload["tokens"]
symbol = (ROOT.parent / "brand-explorations/nora-icon/vector-preview/nora-symbol.svg").read_text(encoding="utf-8")
symbol = re.sub(r'<(?:title|desc)\b[^>]*>.*?</(?:title|desc)>', '', symbol, flags=re.S)
symbol = re.sub(r'\s(?:role|aria-labelledby|width|height)="[^"]*"', '', symbol)
symbol = symbol.replace('<svg ', '<svg aria-hidden="true" focusable="false" ')
symbol = symbol.replace('viewBox="0 0 1254 1254"', 'viewBox="304 298 646 658"')
splash = (ROOT.parent / "brand-explorations/nora-icon/vector-preview/nora-splash-animated.svg").read_text(encoding="utf-8")
for name in ("symbol", "name", "microphone", "appear", "microphone-cue"):
    splash = re.sub(r"\b" + re.escape(name) + r"\b", "splash-" + name, splash)
font_candidates = [ROOT / "assets/NotoSans.ttf", Path(r"C:\Users\galea\.codex\visualizations\2026\10\16\01a1451d-7189-7423-82bb-37552f0bec3c\brand-presentation\build\NotoSans.ttf")]
font = next((path for path in font_candidates if path.exists()), None)
if not font:
    raise FileNotFoundError("Noto Sans font missing. Add assets/NotoSans.ttf before building.")
font_css = '@font-face{font-family:"Noto Sans";src:url(data:font/ttf;base64,' + base64.b64encode(font.read_bytes()).decode() + ') format("truetype");font-style:normal;font-weight:100 900;font-display:block}'
def embed(value):
    return json.dumps(value, ensure_ascii=False).replace("</", "<\\/")
template = (ROOT / "preview-template.html").read_text(encoding="utf-8")
for marker, value in {"__FONT_CSS__": font_css, "__PAYLOAD__": embed(payload), "__TOKENS__": embed(tokens), "__SYMBOL__": embed(symbol), "__SPLASH__": embed(splash)}.items():
    template = template.replace(marker, value)
(ROOT / "index.html").write_text(template, encoding="utf-8", newline="\n")
print(f"Offline viewer built with {len(payload['screens'])} screens and Noto Sans: {ROOT / 'index.html'}")
