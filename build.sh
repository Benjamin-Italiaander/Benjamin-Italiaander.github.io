#!/usr/bin/env bash
# Builder: fetch the latest version of each project from the private server,
# copy its files (without .git) into this site, then commit and push to GitHub.
# After GitHub Pages has published the new version, search engines that support
# IndexNow (Bing, Yandex, Seznam, ...) are told which pages to re-crawl.
#
# Usage: ./build.sh ["commit message"]
#        NO_INDEXNOW=1 ./build.sh ...   # skip the search engine notification
set -euo pipefail
cd "$(dirname "$0")"

SERVER="ssh://git@100.64.0.11/benjamin"
PROJECTS=(klokijk-quizz reken-quizz reken-werkbladen)
SITE="https://italiaander.net"
REPO="Benjamin-Italiaander/Benjamin-Italiaander.github.io"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for p in "${PROJECTS[@]}"; do
  echo "-> fetching $p"
  # retry once: the ssh agent sometimes refuses the first signing request
  git clone -q --depth 1 --branch main "$SERVER/$p.git" "$TMP/$p" 2>/dev/null \
    || { sleep 2; git clone -q --depth 1 --branch main "$SERVER/$p.git" "$TMP/$p"; }
  echo "   $(git -C "$TMP/$p" log --oneline -1)"
  mkdir -p "$p"
  rsync -a --delete --exclude .git "$TMP/$p/" "$p/"
  git add -A "$p"
done

if git diff --cached --quiet; then
  echo "Nothing changed - site is up to date."
  exit 0
fi

git commit -q -m "${1:-Update projects from server}"
git push
echo "Done - pushed to GitHub."

# ---------- IndexNow: notify search engines ----------
[ "${NO_INDEXNOW:-}" = "1" ] && exit 0

indexnow() {
  local key sha status urls
  key="$(ls | grep -E '^[0-9a-f]{32}\.txt$' | head -1 | sed 's/\.txt$//')"
  [ -n "$key" ] || { echo "IndexNow: no key file found, skipped."; return; }

  sha="$(git rev-parse HEAD)"
  echo "-> waiting for GitHub Pages to publish ${sha:0:7} (max ~5 min)"
  for _ in $(seq 1 30); do
    status="$(curl -s "https://api.github.com/repos/$REPO/actions/runs?head_sha=$sha&per_page=1" \
      | python3 -c 'import json,sys
r=json.load(sys.stdin).get("workflow_runs") or [{}]
print(r[0].get("status","pending"), r[0].get("conclusion"))' 2>/dev/null || echo "unknown")"
    case "$status" in
      "completed success") break ;;
      completed*) echo "IndexNow: Pages deploy did not succeed ($status), skipped."; return ;;
    esac
    sleep 10
  done
  [ "$status" = "completed success" ] || { echo "IndexNow: deploy still running, skipped. Run again later."; return; }

  urls="$(grep -ho '<loc>[^<]*' sitemap-*.xml | sed 's/<loc>//')"
  python3 - "$SITE" "$key" "$urls" > "$TMP/indexnow.json" <<'PY'
import json, sys
site, key, urls = sys.argv[1], sys.argv[2], sys.argv[3].split()
print(json.dumps({"host": site.split("//")[1], "key": key,
                  "keyLocation": f"{site}/{key}.txt", "urlList": urls}))
PY
  code="$(curl -s -o /dev/null -w '%{http_code}' -X POST "https://api.indexnow.org/indexnow" \
    -H 'Content-Type: application/json; charset=utf-8' --data @"$TMP/indexnow.json")"
  case "$code" in
    200|202) echo "IndexNow: $(echo "$urls" | wc -l) pages submitted to search engines." ;;
    *)       echo "IndexNow: submission returned HTTP $code (site is still published fine)." ;;
  esac
}
indexnow || echo "IndexNow: notification failed (site is still published fine)."
