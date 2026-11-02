#!/usr/bin/env bash
# Push every submodule that has new commits, then record their new
# versions in the main repo with one commit and push it.
#
# Usage: ./sync-submodules.sh ["commit message"]
set -euo pipefail
cd "$(dirname "$0")"

for sub in $(git config -f .gitmodules --get-regexp '\.path$' | awk '{print $2}'); do
  if [ -n "$(git -C "$sub" status --porcelain)" ]; then
    echo "!! $sub has uncommitted changes - commit them inside $sub first." >&2
    exit 1
  fi
  echo "-> pushing $sub"
  git -C "$sub" push origin HEAD:main
  git add "$sub"
done

if git diff --cached --quiet; then
  echo "Nothing changed in the submodules."
else
  git commit -m "${1:-Update submodules}"
  git push
fi
