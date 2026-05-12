# SLI/SLO для ShiftControl API

## SLI 1: Доступность (Availability)

**Формула:** `(Успешные запросы / Все запросы) * 100%`

**Цель (SLO):** 99.9% за 30 дней (~43 минуты простоя в месяц)

**Метрика:**
```promql
(
  sum(rate(http_requests_total{status_code=~"2..|3.."}[5m]))
  /
  sum(rate(http_requests_total[5m]))
) * 100
```

**Алерт:** `HighErrorRate` — срабатывает при уровне 5xx > 5% в течение 5 минут

---

## SLI 2: Задержка (Latency)

**Формула:** 95-й перцентиль времени ответа

**Цель (SLO):** P95 < 500 мс за 5 минут

**Метрика:**
```promql
histogram_quantile(0.95,
  rate(http_request_duration_seconds_bucket[5m])
)
```

**Алерт:** `HighLatency` — срабатывает при P95 > 500 мс в течение 10 минут

---

## SLI 3: Частота ошибок (Error Rate)

**Формула:** `(5xx запросы / Все запросы) * 100%`

**Цель (SLO):** < 1% за 5 минут

**Метрика:**
```promql
(
  sum(rate(http_requests_total{status_code=~"5.."}[5m]))
  /
  sum(rate(http_requests_total[5m]))
) * 100
```

**Алерт:** `HighErrorRate` (severity: critical, порог 5%)

---

## SLI 4: Насыщение CPU (Saturation)

**Формула:** Средний процент использования CPU хоста

**Цель (SLO):** < 80% в течение 15 минут

**Метрика:**
```promql
(
  1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))
) * 100
```

**Алерт:** `HighCPUUsage` — срабатывает при CPU > 80% в течение 5 минут

---

## Сводная таблица

| SLI | Формула | SLO | Алерт |
|-----|---------|-----|-------|
| Доступность | `successful_requests / total_requests` | 99.9% / 30 дней | HighErrorRate |
| Задержка P95 | `histogram_quantile(0.95, ...)` | < 500 мс | HighLatency |
| Частота ошибок | `5xx / total * 100` | < 1% | HighErrorRate |
| Насыщение CPU | `(1 - idle_cpu) * 100` | < 80% | HighCPUUsage |
