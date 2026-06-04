#!/usr/bin/env bash
# PostToolUse (Edit|Write|MultiEdit) check.
# When a .ts/.tsx file is edited, run that workspace's `pnpm typecheck`.
# Runs async (asyncRewake) and exits 2 on failure so the model is only
# interrupted when the edit introduced a type error.
set -uo pipefail

file_path=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).tool_input.file_path||"")}catch{console.log("")}})')

case "$file_path" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

case "$file_path" in
  */apps/api/*)       pkg=apps/api ;;
  */apps/web/*)       pkg=apps/web ;;
  */packages/types/*) pkg=packages/types ;;
  *) exit 0 ;;
esac

# Repo root = two levels up from this script (.claude/hooks/ -> repo root)
root="$(cd "$(dirname "$0")/../.." && pwd)"

out=$(cd "$root/$pkg" && pnpm -s typecheck 2>&1) || {
  echo "TypeScript typecheck failed in $pkg after editing $(basename "$file_path"):"
  echo "$out" | tail -40
  exit 2
}
