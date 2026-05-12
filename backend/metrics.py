from prometheus_client import Counter, Histogram, Gauge

# Бизнес-метрики ShiftControl
shifts_created_total = Counter(
    "shiftcontrol_shifts_created_total",
    "Total number of shifts created",
    ["status"],
)

incidents_created_total = Counter(
    "shiftcontrol_incidents_created_total",
    "Total number of incidents created",
    ["severity"],
)

active_sessions = Gauge(
    "shiftcontrol_active_sessions",
    "Number of currently active user sessions",
)

auth_attempts_total = Counter(
    "shiftcontrol_auth_attempts_total",
    "Total authentication attempts",
    ["result"],  # success | failure
)

db_query_duration_seconds = Histogram(
    "shiftcontrol_db_query_duration_seconds",
    "Database query duration in seconds",
    ["operation"],  # select | insert | update | delete
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0),
)
