# Smart Home Sensor Management API

Монолит (Go) и микросервисы: Device Management (Node.js), Data Hub (Python), Temperature API (Node.js).

## Prerequisites

- Docker and Docker Compose

## Getting Started

### Option 1: Using Docker Compose (Recommended)

The easiest way to start the application is to use Docker Compose:

```bash
./init.sh
```

This script will:

1. Build and start PostgreSQL, monolith, Temperature API, Device Management, and Data Hub
2. Wait for PostgreSQL to be ready
3. Display information about how to access the APIs

Alternatively, you can run Docker Compose directly:

```bash
docker-compose up -d
```

**Services:**

| Service             | URL                     |
|---------------------|-------------------------|
| Monolith (API)      | http://localhost:8080   |
| Temperature API     | http://localhost:8081   |
| Device Management   | http://localhost:8082   |
| Data Hub (telemetry)| http://localhost:8083   |


### Option 2: Manual setup

If you prefer to run the application without Docker:

1. Start the PostgreSQL database:

```bash
docker-compose up -d postgres
```

2. Build and run the application:

```bash
go build -o smarthome
./smarthome
```

## API Testing

A Postman collection is provided for testing the API. Import the `smarthome-api.postman_collection.json` file into Postman to get started.

## API Endpoints

- `GET /health` - Health check
- `GET /api/v1/sensors` - Get all sensors
- `GET /api/v1/sensors/:id` - Get a specific sensor
- `POST /api/v1/sensors` - Create a new sensor
- `PUT /api/v1/sensors/:id` - Update a sensor
- `DELETE /api/v1/sensors/:id` - Delete a sensor
- `PATCH /api/v1/sensors/:id/value` - Update a sensor's value and status

### Device Management (порт 8082)

- `GET /api/v1/devices` - Список устройств
- `GET /api/v1/devices/:id` - Устройство по ID
- `GET /api/v1/houses/:houseId/devices` - Устройства по дому
- `POST /api/v1/devices` - Создать устройство
- `PUT /api/v1/devices/:id` - Обновить устройство
- `DELETE /api/v1/devices/:id` - Удалить устройство

### Data Hub (порт 8083)

- `POST /api/v1/telemetry` - Отправить запись телеметрии
- `POST /api/v1/telemetry/batch` - Пакет записей
- `GET /api/v1/telemetry/devices/:deviceId?from=&to=&metric=&limit=` - Телеметрия устройства за период
