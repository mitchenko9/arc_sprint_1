import json
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Optional

import psycopg2
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgres://postgres:postgres@localhost:5432/smarthome"
)


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def init_db():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS telemetry_data (
                    id BIGSERIAL PRIMARY KEY,
                    device_id UUID NOT NULL,
                    metric VARCHAR(100) NOT NULL,
                    value NUMERIC,
                    value_json JSONB,
                    unit VARCHAR(20),
                    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                )
            """)
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_telemetry_device_recorded ON telemetry_data(device_id, recorded_at)"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_telemetry_metric ON telemetry_data(metric)"
            )
        conn.commit()
    finally:
        conn.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield
    pass


app = FastAPI(title="Data Hub", description="Телеметрия устройств", lifespan=lifespan)


class TelemetryRecord(BaseModel):
    device_id: uuid.UUID
    metric: str
    value: Optional[float] = None
    value_json: Optional[dict[str, Any]] = None
    unit: Optional[str] = None
    recorded_at: Optional[datetime] = None


class TelemetryBatch(BaseModel):
    records: list[TelemetryRecord]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/v1/telemetry", status_code=201)
def post_telemetry(record: TelemetryRecord):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO telemetry_data (device_id, metric, value, value_json, unit, recorded_at)
                VALUES (%s, %s, %s, %s, %s, COALESCE(%s, NOW()))
                """,
                (
                    str(record.device_id),
                    record.metric,
                    record.value,
                    json.dumps(record.value_json) if record.value_json else None,
                    record.unit,
                    record.recorded_at,
                ),
            )
        conn.commit()
        return {"status": "created"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.post("/api/v1/telemetry/batch")
def post_telemetry_batch(batch: TelemetryBatch):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            for record in batch.records:
                cur.execute(
                    """
                    INSERT INTO telemetry_data (device_id, metric, value, value_json, unit, recorded_at)
                    VALUES (%s, %s, %s, %s, %s, COALESCE(%s, NOW()))
                    """,
                    (
                        str(record.device_id),
                        record.metric,
                        record.value,
                        json.dumps(record.value_json) if record.value_json else None,
                        record.unit,
                        record.recorded_at,
                    ),
                )
        conn.commit()
        return {"status": "created", "count": len(batch.records)}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.get("/api/v1/telemetry/devices/{device_id}")
def get_device_telemetry(
    device_id: uuid.UUID,
    from_time: datetime = Query(..., alias="from"),
    to_time: datetime = Query(..., alias="to"),
    metric: Optional[str] = Query(None),
    limit: int = Query(100, le=1000),
):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            if metric:
                cur.execute(
                    """
                    SELECT recorded_at, value, value_json, unit
                    FROM telemetry_data
                    WHERE device_id = %s AND recorded_at >= %s AND recorded_at <= %s AND metric = %s
                    ORDER BY recorded_at
                    LIMIT %s
                    """,
                    (str(device_id), from_time, to_time, metric, limit),
                )
            else:
                cur.execute(
                    """
                    SELECT recorded_at, value, value_json, unit, metric
                    FROM telemetry_data
                    WHERE device_id = %s AND recorded_at >= %s AND recorded_at <= %s
                    ORDER BY recorded_at
                    LIMIT %s
                    """,
                    (str(device_id), from_time, to_time, limit),
                )
            rows = cur.fetchall()
        def row_value(r):
            if r[1] is not None:
                return float(r[1])
            if r[2] is not None:
                return r[2]
            return None
        def row_time(r):
            t = r[0]
            return t.isoformat() if hasattr(t, "isoformat") else str(t)
        data = [
            {"recorded_at": row_time(r), "value": row_value(r), "unit": r[3]}
            for r in rows
        ]
        return {
            "device_id": str(device_id),
            "from": from_time.isoformat(),
            "to": to_time.isoformat(),
            "metric": metric,
            "data": data,
        }
    finally:
        conn.close()
