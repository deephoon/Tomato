#!/usr/bin/env bash
# Stop hook — run vitest when src/ has uncommitted changes, and block the turn
# from ending if tests fail. Keeps me from finishing with a broken suite.
set -uo pipefail

input=$(cat)

# Avoid loops: if a previous Stop hook already blocked this turn, let it end.
if [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)" = "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$PWD}" || exit 0

# Only verify when source/tests actually changed — skip pure discussion turns.
if git diff --quiet -- src 2>/dev/null && git diff --cached --quiet -- src 2>/dev/null; then
  exit 0
fi

log=/tmp/claude-tomato-test.log
if npm test >"$log" 2>&1; then
  exit 0
fi

tail_lines=$(tail -n 15 "$log" | tr '\n' ' ')
jq -n --arg t "$tail_lines" \
  '{decision:"block", reason:("npm test 실패 — 종료 전 테스트를 고치세요. 마지막 로그: " + $t + " (전체: /tmp/claude-tomato-test.log)")}'
exit 0
