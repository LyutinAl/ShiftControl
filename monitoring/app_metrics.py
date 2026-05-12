"""
Демонстрация инструментации FastAPI-приложения метриками Prometheus.
Показывает все три типа метрик и пример бизнес-метрики.

Запуск:
    pip install fastapi uvicorn prometheus-fastapi-instrumentator prometheus-client
    uvicorn app_metrics:app --port 8080
"""

import random
import time

from fastapi import FastAPI, Response
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI(title="ShiftControl Metrics Demo")

# --- 1. Counter: монотонно растущий счётчик ---------------------------------
http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)

# --- 2. Histogram: распределение времени ответа -----------------------------
http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["endpoint"],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

# --- 3. Gauge: текущее состояние --------------------------------------------
active_requests = Gauge(
    "active_requests",
    "Number of active HTTP requests",
)

# --- 4. Бизнес-метрика: счётчик созданных смен ------------------------------
shifts_created_total = Counter(
    "shiftcontrol_shifts_created_total",
    "Total number of shifts created",
    ["status"],
)

# Автоматическая инструментация всех маршрутов через instrumentator
Instrumentator().instrument(app).expose(app, endpoint="/metrics", tags=["observability"])


@app.get("/api/users", tags=["demo"])
def get_users():
    start = time.time()
    active_requests.inc()
    try:
        time.sleep(random.uniform(0.01, 0.1))
        http_requests_total.labels("GET", "/api/users", "200").inc()
        return {"users": ["alice", "bob"]}
    except Exception as exc:
        http_requests_total.labels("GET", "/api/users", "500").inc()
        raise exc
    finally:
        http_request_duration_seconds.labels("/api/users").observe(time.time() - start)
        active_requests.dec()


@app.post("/api/shifts", tags=["demo"])
def create_shift():
    shifts_created_total.labels(status="open").inc()
    http_requests_total.labels("POST", "/api/shifts", "201").inc()
    return {"id": random.randint(1, 1000), "status": "open"}
