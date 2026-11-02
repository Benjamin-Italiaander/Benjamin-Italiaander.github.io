#!/usr/bin/env bash
# Builder: fetch the latest version of each project from the private server,
# copy its files (without .git) into this site, then commit and push to GitHub.
#
# Usage: ./build.sh ["commit message"]
set -euo pipefail
cd "$(dirname "$0")"

SERVER="ssh://git@100.64.0.11/benjamin"
PROJECTS=(klokijk-quizz reken-quizz reken-werkbladen)

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for p in "${PROJECTS[@]}"; do
  echo "-> fetching $p"
  git clone -q --depth 1 --branch main "$SERVER/$p.git" "$TMP/$p"
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
