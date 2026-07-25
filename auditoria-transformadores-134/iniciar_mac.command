#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if command -v pnpm >/dev/null 2>&1; then
  pnpm install
  pnpm run dev &
else
  npm install
  npm run dev &
fi
sleep 4
open "http://localhost:3000"
wait
