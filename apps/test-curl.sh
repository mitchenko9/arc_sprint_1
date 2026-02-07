#!/bin/bash
# Тестовые curl-запросы для проверки микросервисов (запуск: ./test-curl.sh)
# Убедитесь, что контейнеры запущены: docker-compose up -d

BASE_MONOLITH="http://localhost:8080"
BASE_TEMPERATURE="http://localhost:8081"
BASE_DEVICE_MGMT="http://localhost:8082"
BASE_DATA_HUB="http://localhost:8083"

echo "=== 1. Health checks ==="
echo "Monolith:"
curl -s "$BASE_MONOLITH/health" | head -1
echo ""
echo "Temperature API:"
curl -s "$BASE_TEMPERATURE/health" | head -1
echo ""
echo "Device Management:"
curl -s "$BASE_DEVICE_MGMT/health" | head -1
echo ""
echo "Data Hub:"
curl -s "$BASE_DATA_HUB/health" | head -1
echo ""

echo "=== 2. Device Management — список устройств (пусто при первом запуске) ==="
curl -s "$BASE_DEVICE_MGMT/api/v1/devices"
echo ""

echo "=== 3. Device Management — создать устройство ==="
curl -s -X POST "$BASE_DEVICE_MGMT/api/v1/devices" \
  -H "Content-Type: application/json" \
  -d '{"name":"Термостат гостиная","type":"temperature","location":"Гостиная","status":"online"}'
echo ""

echo "=== 4. Device Management — список устройств после создания ==="
curl -s "$BASE_DEVICE_MGMT/api/v1/devices"
echo ""

echo "=== 5. Device Management — устройство по ID (подставьте device_id из шага 3) ==="
DEVICE_ID=$(curl -s "$BASE_DEVICE_MGMT/api/v1/devices" | grep -o '"device_id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$DEVICE_ID" ]; then
  curl -s "$BASE_DEVICE_MGMT/api/v1/devices/$DEVICE_ID"
else
  echo "Нет устройств, пропуск"
fi
echo ""

echo "=== 6. Data Hub — отправить телеметрию ==="
# Используем device_id из Device Management или тестовый UUID
TELEMETRY_DEVICE_ID="${DEVICE_ID:-00000000-0000-0000-0000-000000000001}"
curl -s -X POST "$BASE_DATA_HUB/api/v1/telemetry" \
  -H "Content-Type: application/json" \
  -d "{\"device_id\":\"$TELEMETRY_DEVICE_ID\",\"metric\":\"temperature\",\"value\":22.5,\"unit\":\"celsius\"}"
echo ""

echo "=== 7. Data Hub — получить телеметрию за период ==="
FROM="2024-01-01T00:00:00Z"
TO="2030-12-31T23:59:59Z"
curl -s "$BASE_DATA_HUB/api/v1/telemetry/devices/$TELEMETRY_DEVICE_ID?from=$FROM&to=$TO&limit=10"
echo ""

echo "=== 8. Monolith — список датчиков ==="
curl -s "$BASE_MONOLITH/api/v1/sensors"
echo ""

echo "=== 9. Monolith — обновить значение датчика (ID=1, также шлёт телеметрию в Data Hub) ==="
curl -s -X PATCH "$BASE_MONOLITH/api/v1/sensors/1/value" \
  -H "Content-Type: application/json" \
  -d '{"value":21.0,"status":"active"}'
echo ""

echo "=== 10. Data Hub — телеметрия датчика монолита (sensor id 1 → device_id 00000000-0000-0000-0000-000000000001) ==="
curl -s "$BASE_DATA_HUB/api/v1/telemetry/devices/00000000-0000-0000-0000-000000000001?from=2024-01-01T00:00:00Z&to=$TO&limit=5"
echo ""

echo "=== 11. Temperature API (внешний для монолита) ==="
curl -s "$BASE_TEMPERATURE/temperature?location=Living%20Room"
echo ""

echo "Готово."
