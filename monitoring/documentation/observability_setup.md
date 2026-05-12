# Observability Setup — ShiftControl

## Архитектура

```mermaid
graph TB
    subgraph app["Приложение (shiftcontrol_internal)"]
        FE[Frontend :8080]
        BE[FastAPI Backend :8000]
        DB[(PostgreSQL)]
        RD[(Redis)]
        FE --> BE
        BE --> DB
        BE --> RD
    end

    subgraph monitoring["Мониторинг (monitoring network)"]
        PROM[Prometheus :9090]
        AM[Alertmanager :9093]
        GF[Grafana :3200]
        LOKI[Loki internal]
        PT[Promtail :9080]
        NE[Node Exporter :9100]
    end

    PROM -->|scrape /metrics| BE
    PROM -->|scrape| NE
    PROM -->|alerts| AM
    AM -->|email| SMTP[Yandex SMTP :465]
    PT -->|push logs| LOKI
    GF -->|query| PROM
    GF -->|query| LOKI
    PT -->|read| DOCKER[/var/lib/docker/containers]
```

## Компоненты и конфигурация

| Компонент     | Образ                        | Порт  | Конфигурация                               |
|---------------|------------------------------|-------|--------------------------------------------|
| Prometheus    | prom/prometheus:v2.47.0      | 9090  | `prometheus/prometheus.yml`, retention 15d  |
| Grafana       | grafana/grafana:10.1.0       | 3200  | provisioning via YAML, credentials в .env  |
| Loki          | grafana/loki:2.9.0           | —     | `loki/loki.yml`, retention 744h (31 день)  |
| Promtail      | grafana/promtail:2.9.0       | 9080  | `promtail/promtail.yml`                    |
| Alertmanager  | prom/alertmanager:v0.27.0    | 9093  | `alertmanager/alertmanager.yml` + .env     |
| Node Exporter | prom/node-exporter:v1.6.1    | 9100  | стандартные коллекторы                     |

### Prometheus (`prometheus/prometheus.yml`)
- Интервал скрейпинга: 15 секунд
- Цели: FastAPI backend (`host.docker.internal:8000`), Node Exporter (`node-exporter:9100`), сам Prometheus
- Правила алертов: `prometheus/alerts/api_alerts.yml`

### Grafana (`grafana/provisioning/`)
- Datasources: Prometheus (default, uid=`prometheus`) и Loki (uid=`loki`) — provisioning при старте
- Dashboards: автозагрузка из `/etc/grafana/dashboards` каждые 30 секунд
- Credentials: задаются через переменные окружения `GF_SECURITY_ADMIN_USER / PASSWORD`

### Loki (`loki/loki.yml`)
- Хранилище: filesystem (`/loki/chunks`, `/loki/rules`)
- Режим: single-binary с in-memory ring (без Consul)
- Retention: 744 часов (31 день)
- Schema: tsdb v13

### Promtail (`promtail/promtail.yml`)
- Источник: `/var/lib/docker/containers/*/*log` (статический путь)
- Pipeline: JSON decode → regex для извлечения метки `container` из `attrs.tag`
- Все контейнеры логируют с `log_driver: json-file` и `tag: "{{.Name}}"`

### Alertmanager (`alertmanager/alertmanager.yml`)
- SMTP: Яндекс, порт 465, implicit TLS (`smtp_require_tls: false`)
- Credentials: подставляются через `start.sh` (sed) из переменных окружения
- Маршрутизация: critical → немедленно, warning → группировка 5 мин
- Repeat interval: 4 часа

## Дашборды Grafana

### API Golden Signals
Путь: `grafana/dashboards/api-golden-signals.json`

| Панель | Тип | Метрика |
|--------|-----|---------|
| Request Rate | stat | `sum(rate(http_requests_total[5m]))` |
| Error Rate % | stat (пороги: 1%=yellow, 5%=red) | `(sum(5xx) / sum(total)) * 100` |
| Latency P95 | stat (пороги: 500ms=yellow, 1s=red) | `histogram_quantile(0.95, ...)` |
| CPU Saturation | gauge (пороги: 70%=yellow, 85%=red) | `(1 - avg(rate(idle[5m]))) * 100` |
| Latency Percentiles | timeseries | P50 / P95 / P99 |
| Request Rate by Status | timeseries | 2xx=green, 4xx=yellow, 5xx=red |

### Infrastructure (Node Exporter)
Путь: `grafana/dashboards/infrastructure.json`

| Панель | Тип | Метрика |
|--------|-----|---------|
| CPU Usage % | timeseries | `node_cpu_seconds_total{mode="idle"}` |
| Memory Usage % | timeseries | `1 - MemAvailable / MemTotal` |
| Disk Usage % | gauge | `1 - avail / size` (без tmpfs/overlay) |
| Network I/O | timeseries | receive (positive) / transmit (negative-Y) |

### Container Logs
Путь: `grafana/dashboards/logs.json`

| Панель | Тип | LogQL |
|--------|-----|-------|
| Log Rate | timeseries | `sum by (container) (count_over_time({job="container-logs", container=~"$container"}[1m]))` |
| Error Rate | timeseries | то же + `\|= "error"` |
| Logs | logs panel | `{job="container-logs", container=~"$container"}` |

Template variable `$container`: `label_values(container)` — выпадающий список всех контейнеров.

## Быстрый старт

```bash
cd monitoring
cp .env.example .env
# Заполнить .env: SMTP-данные, GF_SECURITY_ADMIN_PASSWORD

docker compose up -d

# Проверка
# Prometheus targets: http://localhost:9090/targets
# Grafana:           http://localhost:3200  (admin / из .env)
# Alertmanager:      http://localhost:9093
# Promtail status:   http://localhost:9080/targets
```
