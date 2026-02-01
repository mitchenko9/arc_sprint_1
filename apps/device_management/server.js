const express = require('express');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8082;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/smarthome',
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        house_id UUID,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        location VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'offline',
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_devices_house_id ON devices(house_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status)');
  } finally {
    client.release();
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/v1/houses/:houseId/devices', async (req, res) => {
  const { houseId } = req.params;
  try {
    const result = await pool.query(
      'SELECT id AS device_id, name, type, location, status FROM devices WHERE house_id = $1 OR house_id IS NULL ORDER BY created_at',
      [houseId]
    );
    const devices = result.rows.map((r) => ({
      device_id: r.device_id,
      name: r.name,
      device_type_id: r.device_id,
      status: r.status,
      location: r.location,
    }));
    res.json({ house_id: houseId, devices });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

app.get('/api/v1/devices', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id AS device_id, house_id, name, type, location, status, settings, created_at AS registered_at FROM devices ORDER BY created_at'
    );
    res.json({ devices: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

app.get('/api/v1/devices/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT id AS device_id, house_id, name, type, location, status, settings, created_at AS registered_at FROM devices WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'device_not_found', message: 'Устройство с указанным ID не найдено' });
    }
    const row = result.rows[0];
    res.json({
      device_id: row.device_id,
      house_id: row.house_id,
      device_type_id: row.house_id || row.device_id,
      serial_number: null,
      name: row.name,
      status: row.status,
      location: row.location,
      settings: row.settings || {},
      registered_at: row.registered_at,
    });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

app.post('/api/v1/devices', async (req, res) => {
  const { name, type, location, house_id, status = 'offline', settings = {} } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'validation_error', message: 'name and type are required' });
  }
  const id = uuidv4();
  try {
    await pool.query(
      `INSERT INTO devices (id, house_id, name, type, location, status, settings, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [id, house_id || null, name, type, location || null, status, JSON.stringify(settings)]
    );
    const result = await pool.query(
      'SELECT id AS device_id, house_id, name, type, location, status, settings, created_at AS registered_at FROM devices WHERE id = $1',
      [id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

app.put('/api/v1/devices/:id', async (req, res) => {
  const { id } = req.params;
  const { name, type, location, status, settings } = req.body;
  try {
    const result = await pool.query(
      `UPDATE devices SET name = COALESCE($1, name), type = COALESCE($2, type), location = COALESCE($3, location),
        status = COALESCE($4, status), settings = COALESCE($5, settings), updated_at = NOW()
       WHERE id = $6 RETURNING id AS device_id, house_id, name, type, location, status, settings, created_at AS registered_at`,
      [name, type, location, status, settings ? JSON.stringify(settings) : null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'device_not_found', message: 'Устройство с указанным ID не найдено' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

app.delete('/api/v1/devices/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM devices WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'device_not_found', message: 'Устройство с указанным ID не найдено' });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Device Management listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
