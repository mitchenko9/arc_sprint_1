# Тестовые curl-запросы для проверки микросервисов

Перед проверкой поднимите сервисы: `docker-compose up -d` (из каталога `apps`).

---

## 1. Health checks (все сервисы живы)

```bash
curl -s http://localhost:8080/health
curl -s http://localhost:8081/health
curl -s http://localhost:8082/health
curl -s http://localhost:8083/health
```

Ожидается: `{"status":"ok"}` (или аналог).

---

## 2. Device Management (порт 8082)

**Список устройств:**
```bash
curl -s http://localhost:8082/api/v1/devices
```

**Создать устройство:**
```bash
curl -s -X POST http://localhost:8082/api/v1/devices \
  -H "Content-Type: application/json" \
  -d '{"name":"Термостат гостиная","type":"temperature","location":"Гостиная","status":"online"}'
```

**Устройство по ID** (подставьте `DEVICE_ID` из ответа создания):
```bash
curl -s http://localhost:8082/api/v1/devices/<DEVICE_ID>
```

**Устройства по дому** (любой UUID для теста):
```bash
curl -s "http://localhost:8082/api/v1/houses/7c9e6679-7425-40de-944b-e07fc1f90ae7/devices"
```

---

## 3. Data Hub (порт 8083)

**Отправить телеметрию:**
```bash
curl -s -X POST http://localhost:8083/api/v1/telemetry \
  -H "Content-Type: application/json" \
  -d '{"device_id":"00000000-0000-0000-0000-000000000001","metric":"temperature","value":22.5,"unit":"celsius"}'
```

**Получить телеметрию за период:**
```bash
curl -s "http://localhost:8083/api/v1/telemetry/devices/00000000-0000-0000-0000-000000000001?from=2024-01-01T00:00:00Z&to=2025-12-31T23:59:59Z&limit=10"
```

**Пакет телеметрии:**
```bash
curl -s -X POST http://localhost:8083/api/v1/telemetry/batch \
  -H "Content-Type: application/json" \
  -d '{"records":[{"device_id":"00000000-0000-0000-0000-000000000001","metric":"temperature","value":21.0,"unit":"celsius"},{"device_id":"00000000-0000-0000-0000-000000000001","metric":"humidity","value":55,"unit":"%"}]}'
```

---

## 4. Monolith (порт 8080)

**Список датчиков:**
```bash
curl -s http://localhost:8080/api/v1/sensors
```

**Обновить значение датчика** (одновременно шлёт телеметрию в Data Hub):
```bash
curl -s -X PATCH http://localhost:8080/api/v1/sensors/1/value \
  -H "Content-Type: application/json" \
  -d '{"value":21.0,"status":"active"}'
```

**Проверить телеметрию датчика в Data Hub** (sensor id 1 → device_id `00000000-0000-0000-0000-000000000001`):
```bash
curl -s "http://localhost:8083/api/v1/telemetry/devices/00000000-0000-0000-0000-000000000001?from=2024-01-01T00:00:00Z&to=2025-12-31T23:59:59Z&limit=5"
```

---

## 5. Temperature API (порт 8081)

```bash
curl -s "http://localhost:8081/temperature?location=Living%20Room"
curl -s http://localhost:8081/temperature/1
```

---

## Запуск скрипта (все проверки подряд)

```bash
chmod +x test-curl.sh
./test-curl.sh
```
