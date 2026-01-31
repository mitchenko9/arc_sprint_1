const express = require('express');
const app = express();

const PORT = process.env.PORT || 8081;

const SENSOR_ID_TO_LOCATION = {
  '1': 'Living Room',
  '2': 'Bedroom',
  '3': 'Kitchen',
};

const LOCATION_TO_SENSOR_ID = {};
for (const [id, loc] of Object.entries(SENSOR_ID_TO_LOCATION)) {
  LOCATION_TO_SENSOR_ID[loc] = id;
}

function getLocationBySensorId(sensorId) {
  if (sensorId == null || sensorId === '') return null;
  return SENSOR_ID_TO_LOCATION[sensorId] ?? 'Unknown';
}

function getSensorIdByLocation(location) {
  if (location == null || location === '') return null;
  const normalized = String(location).trim();
  return LOCATION_TO_SENSOR_ID[normalized] ?? '0';
}


function randomTemperature(minC = 18, maxC = 26) {
  return Math.round((minC + Math.random() * (maxC - minC)) * 10) / 10;
}

function buildTemperatureResponse(location, sensorId) {
  const value = randomTemperature();
  const now = new Date();

  return {
    value,
    unit: 'C',
    timestamp: now.toISOString(),
    location: location || 'Unknown',
    status: 'ok',
    sensor_id: sensorId || '0',
    sensor_type: 'temperature',
    description: `Temperature sensor at ${location || 'Unknown'}: ${value}°C`,
  };
}

app.get('/temperature', (req, res) => {
  let location = (req.query.location || '').trim();
  let sensorId = (req.query.sensor_id || req.query.sensorId || '').trim();

  if (location === '') {
    switch (sensorId) {
      case '1':
        location = 'Living Room';
        break;
      case '2':
        location = 'Bedroom';
        break;
      case '3':
        location = 'Kitchen';
        break;
      default:
        location = 'Unknown';
    }
  }

  if (sensorId === '') {
    switch (location) {
      case 'Living Room':
        sensorId = '1';
        break;
      case 'Bedroom':
        sensorId = '2';
        break;
      case 'Kitchen':
        sensorId = '3';
        break;
      default:
        sensorId = '0';
    }
  }

  const payload = buildTemperatureResponse(location, sensorId);
  res.json(payload);
});

app.get('/temperature/:sensorId', (req, res) => {
  const sensorId = req.params.sensorId || '';
  const location = getLocationBySensorId(sensorId) ?? 'Unknown';
  const payload = buildTemperatureResponse(location, sensorId);
  res.json(payload);
});


app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});


app.listen(PORT, () => {
  console.log(`start on port ${PORT}`);
});
