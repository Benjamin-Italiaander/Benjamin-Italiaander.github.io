#!/usr/bin/env python3
"""Put the Google tag with cookie consent (Consent Mode v2) in the <head> of HTML pages.

Usage: tools/add-google-tag.py FILE_OR_DIR...

An existing "<!-- Google tag (gtag.js) -->" block is replaced, keeping any extra
measurement IDs it configures. Pages that already have the consent version and
pages without a <head> (such as the Search Console verification file) are left
alone, so the script is safe to run again. build.sh runs it after syncing the
quiz projects, because that sync overwrites their files.
"""
import pathlib
import re
import sys

MAIN_ID = "G-149SW6X5M5"
MARKER = "/assets/js/cookie-consent.js"

OLD_BLOCK = re.compile(
    r"[ \t]*<!-- Google tag \(gtag\.js\) -->\s*"
    r"<script async src=\"https://www\.googletagmanager\.com/gtag/js\?id=[^\"]+\"></script>\s*"
    r"<script>.*?</script>[ \t]*\n?",
    re.S,
)
HEAD = re.compile(r"<head(\s[^>]*)?>", re.I)
CHARSET = re.compile(r"<meta\s+charset=[^>]*>", re.I)


def block(ids):
    configs = "\n".join(f"    gtag('config', '{i}');" for i in ids)
    return f"""  <!-- Google tag (gtag.js) with cookie consent: analytics only after "Accept" -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    (function () {{
      var c = null;
      try {{ c = localStorage.getItem('cookie-consent'); }} catch (e) {{}}
      gtag('consent', 'default', {{
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied',
        'analytics_storage': c === 'granted' ? 'granted' : 'denied'
      }});
    }})();
    gtag('js', new Date());
{configs}
  </script>
  <script async src="https://www.googletagmanager.com/gtag/js?id={MAIN_ID}"></script>
  <script src="{MARKER}" defer></script>
"""


def process(path):
    html = path.read_text(encoding="utf-8")
    if MARKER in html or not HEAD.search(html):
        return False
    ids = [MAIN_ID]
    old = OLD_BLOCK.search(html)
    if old:
        for i in re.findall(r"gtag\('config',\s*'([^']+)'\)", old.group(0)):
            if i not in ids:
                ids.append(i)
        html = html[: old.start()] + html[old.end():]
    # Directly after <meta charset> (it must stay in the first 1024 bytes), else after <head>.
    m = HEAD.search(html)
    head_end = html.lower().find("</head>", m.end())
    cs = CHARSET.search(html, m.end(), head_end if head_end != -1 else len(html))
    if cs:
        m = cs
    html = html[: m.end()] + "\n" + block(ids) + html[m.end():].lstrip("\n")
    path.write_text(html, encoding="utf-8")
    return True


def main(args):
    for arg in args or ["."]:
        p = pathlib.Path(arg)
        files = [p] if p.is_file() else sorted(p.rglob("*.html"))
        for f in files:
            if ".git" in f.parts:
                continue
            if process(f):
                print(f"   google tag + consent -> {f}")


if __name__ == "__main__":
    main(sys.argv[1:])
