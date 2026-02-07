#!/bin/bash
set -e

if command -v apt-get &>/dev/null; then
  apt-get update
  apt-get install -y docker.io docker-compose-plugin
elif [[ -x /opt/homebrew/bin/brew ]] || [[ -x /usr/local/bin/brew ]]; then
  BREW="/opt/homebrew/bin/brew"
  [[ -x /usr/local/bin/brew ]] && BREW="/usr/local/bin/brew"
  export PATH="$("$BREW" --prefix)/bin:$PATH"
  $BREW install --cask docker 2>/dev/null || true
  # или только проверка: command -v docker || { echo "Install Docker Desktop"; exit 1; }
elif command -v brew &>/dev/null; then
  brew install --cask docker 2>/dev/null || true
else
  echo "Unknown system; install Docker manually."
  exit 1
fi