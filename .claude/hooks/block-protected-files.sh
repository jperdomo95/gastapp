#!/usr/bin/env bash
# PreToolUse (Edit|Write|MultiEdit) guard.
# Denies edits to secret/lockfile-integrity files: .env and pnpm-lock.yaml.
# .env.example is intentionally allowed.
set -euo pipefail

file_path=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).tool_input.file_path||"")}catch{console.log("")}})')
base=$(basename "$file_path")

if [ "$base" = ".env" ] || [ "$base" = "pnpm-lock.yaml" ]; then
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Editing %s is blocked by project policy (secrets / lockfile integrity). Change it manually if truly intended."}}\n' "$base"
fi
