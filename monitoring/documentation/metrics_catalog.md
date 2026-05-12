# Каталог метрик ShiftControl

## Метрики приложения (prometheus-fastapi-instrumentator)

### http_requests_total
- **Тип:** Counter
- **Описание:** Общее количество HTTP-запросов к API
- **Лейблы:** `method`, `handler`, `status_code`
- **Пример запроса:** `sum(rate(http_requests_total[5m])) by (handler, status_code)`
- **Пример значения:** `http_requests_total{method="GET", handler="/api/shifts", status_code="200"}`

### http_request_duration_seconds
- **Тип:** Histogram
- **Описание:** Время обработки HTTP-запроса в секундах
- **Лейблы:** `method`, `handler`, `status_code`
- **Бакеты:** 0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0
- **Пример запроса:** `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))`
- **Использование:** вычисление P50/P95/P99 latency

### http_request_size_bytes
- **Тип:** Histogram
- **Описание:** Размер тела входящего HTTP-запроса
- **Лейблы:** `method`, `handler`, `status_code`

### http_response_size_bytes
- **Тип:** Histogram
- **Описание:** Размер тела HTTP-ответа
- **Лейблы:** `method`, `handler`, `status_code`

---

## Бизнес-метрики приложения

### shiftcontrol_shifts_created_total
- **Тип:** Counter
- **Описание:** Общее количество созданных смен
- **Лейблы:** `status` (open, closed, cancelled)
- **Пример запроса:** `rate(shiftcontrol_shifts_created_total[1h])`

### shiftcontrol_incidents_created_total
- **Тип:** Counter
- **Описание:** Общее количество зарегистрированных инцидентов
- **Лейблы:** `severity` (low, medium, high, critical)
- **Пример запроса:** `sum(shiftcontrol_incidents_created_total) by (severity)`

### shiftcontrol_active_sessions
- **Тип:** Gauge
- **Описание:** Текущее количество активных пользовательских сессий
- **Лейблы:** нет
- **Пример запроса:** `shiftcontrol_active_sessions`

### shiftcontrol_auth_attempts_total
- **Тип:** Counter
- **Описание:** Общее количество попыток аутентификации
- **Лейблы:** `result` (success, failure)
- **Пример запроса:** `rate(shiftcontrol_auth_attempts_total{result="failure"}[5m])`

### shiftcontrol_db_query_duration_seconds
- **Тип:** Histogram
- **Описание:** Время выполнения запроса к базе данных
- **Лейблы:** `operation` (select, insert, update, delete)
- **Бакеты:** 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0
- **Пример запроса:** `histogram_quantile(0.99, rate(shiftcontrol_db_query_duration_seconds_bucket[5m])) by (le, operation)`

---

## Метрики инфраструктуры (Node Exporter)

### node_cpu_seconds_total
- **Тип:** Counter
- **Описание:** Суммарное время CPU в секундах по режимам работы
- **Лейблы:** `cpu`, `mode` (idle, user, system, iowait, ...)
- **Пример запроса:** `(1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100`
- **Использование:** вычисление % использования CPU

### node_memory_MemTotal_bytes / node_memory_MemAvailable_bytes
- **Тип:** Gauge
- **Описание:** Общий и доступный объём оперативной памяти в байтах
- **Лейблы:** нет
- **Пример запроса:** `(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100`

### node_filesystem_size_bytes / node_filesystem_avail_bytes
- **Тип:** Gauge
- **Описание:** Размер и доступное место файловой системы
- **Лейблы:** `device`, `fstype`, `mountpoint`
- **Пример запроса:** `(1 - node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100`

### node_network_receive_bytes_total / node_network_transmit_bytes_total
- **Тип:** Counter
- **Описание:** Суммарный сетевой трафик по интерфейсам
- **Лейблы:** `device`
- **Пример запроса:** `rate(node_network_receive_bytes_total[5m])`

---

## Системные метрики (Prometheus)

### up
- **Тип:** Gauge
- **Описание:** Доступность цели скрейпинга (1 = доступна, 0 = недоступна)
- **Лейблы:** `job`, `instance`
- **Использование:** алерт `ServiceDown`

### scrape_duration_seconds
- **Тип:** Gauge
- **Описание:** Время выполнения последнего скрейпа
- **Лейблы:** `job`, `instance`
