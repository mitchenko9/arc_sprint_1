set -e
if command -v apt-get &>/dev/null; then
  apt-get update
  apt-get install -y docker.io docker-compose-plugin
elif command -v brew &>/dev/null; then
  brew install --cask docker
  # Docker Desktop включает docker-compose; или: brew install docker-compose
else
  echo "Unknown system; install Docker manually."
  exit 1
fi