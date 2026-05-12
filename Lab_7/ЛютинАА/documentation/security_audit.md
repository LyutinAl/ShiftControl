# Отчёт аудита безопасности

## Обзор

- **Дата:** 2026-05-12
- **Проект:** ShiftControl — система учёта сменных событий и инцидентов
- **Ветка/коммит:** `feat/devsecops` → `main`
- **Инструменты:** Trivy (image + fs), Gitleaks, Bandit, pip-audit, npm audit, Syft (SBOM)
- **Образ:** `ghcr.io/lyutinal/shiftcontrol:latest` (base: `python:3.14-slim`)

---

## Сводка результатов

| Проверка              | Critical | High | Medium | Low | Info |
|-----------------------|----------|------|--------|-----|------|
| SAST (Bandit)         | 0        | 0    | 0      | 0   | 0    |
| SCA Python (pip-audit)| 0        | 0    | 0      | 0   | —    |
| SCA Frontend (npm)    | 0        | 0    | 0      | 0   | —    |
| SCA FS (Trivy)        | 0        | 0    | 0      | 0   | —    |
| Image (Trivy)         | 0        | 7 †  | 42 †   | 63 †| —    |
| Secrets (Gitleaks)    | 0        | 0    | 0      | 0   | 7 ‡  |
| **ИТОГО**             | **0**    | **7**| **42** | **63**| **7** |

† Все CVE относятся к OS-пакетам Debian — исправления ещё не выпущены (unfixed).
CI настроен с `ignore-unfixed: true` — pipeline не блокируется.

‡ 7 Info = false positives (SHA1-хеши в `.secrets.baseline`), исключены из сканирования через allowlist.

---

## Найденные уязвимости

### Critical

Критических уязвимостей не обнаружено.

### Высокие (High)

Все 7 HIGH CVE находятся в OS-пакетах Debian внутри базового образа `python:3.14-slim`.
Ни для одной из них не выпущено исправление на момент аудита.

#### 1. CVE-2026-4878 — libcap2

- **Компонент:** `libcap2`
- **Версия:** `1:2.75-10+b8` → исправление не выпущено
- **CVSS:** 7.8 (High)
- **Описание:** Privilege escalation через TOCTOU race condition в реализации POSIX capabilities
- **Статус:** ⚠️ Принято — нет доступного патча; контейнер запускается от непривилегированного пользователя `appuser (uid=1001)`

#### 2. CVE-2025-69720 — ncurses (4 пакета)

- **Компоненты:** `libncursesw6`, `libtinfo6`, `ncurses-base`, `ncurses-bin`
- **Версия:** `6.5+20250216-2` → исправление не выпущено
- **CVSS:** 7.5 (High)
- **Описание:** Buffer overflow в ncurses library при обработке специально сформированных terminfo записей
- **Статус:** ⚠️ Принято — нет доступного патча; ncurses не используется приложением напрямую, только транзитивная зависимость Python runtime

#### 3. CVE-2026-29111 — libsystemd0 / libudev1

- **Компоненты:** `libsystemd0`, `libudev1`
- **Версия:** `257.9-1~deb13u1` → исправление не выпущено
- **CVSS:** 7.8 (High)
- **Описание:** Arbitrary code execution или DoS при обработке специфических D-Bus сообщений
- **Статус:** ⚠️ Принято — нет доступного патча; systemd не запускается внутри Docker-контейнера (PID 1 = uvicorn)

### Средние и низкие (Medium / Low)

42 Medium и 63 Low CVE в OS-пакетах Debian — все без доступных исправлений.
Детализация: `artifacts/trivy-image-report.json`.

---

## Python-зависимости

Trivy, pip-audit и SBOM не обнаружили ни одной CVE в Python-пакетах (`requirements.txt`).

| Пакет | Версия | CVE |
|-------|--------|-----|
| fastapi | 0.135.2 | нет |
| sqlalchemy | 2.0.48 | нет |
| uvicorn | 0.42.0 | нет |
| psycopg | (latest) | нет |
| pydantic-settings | 2.13.1 | нет |

---

## Принятые риски

| Уязвимость | Причина принятия | Компенсирующие меры |
|------------|-----------------|---------------------|
| CVE-2026-4878 (libcap2) | Патч не выпущен Debian | Non-root user (`appuser uid=1001`), минимальные capabilities контейнера |
| CVE-2025-69720 (ncurses × 4) | Патч не выпущен Debian | ncurses недоступен из сети, нет входных данных от пользователя через terminfo |
| CVE-2026-29111 (systemd × 2) | Патч не выпущен Debian | systemd не запускается в контейнере, D-Bus не доступен снаружи |
| 42 Medium CVE (OS-пакеты) | Все без патчей | Изолированная сеть Docker, multi-stage build минимизирует набор пакетов |
| 63 Low CVE (OS-пакеты) | Все без патчей, низкий риск | Monitoring через `trivy-image` на каждый push в main |

Все принятые риски относятся к категории "unavailable fix" — устранение возможно только после выхода патчей upstream (Debian).

---

## Рекомендации

1. [ ] Обновить базовый образ `python:3.14-slim` при выходе патчей Debian для ncurses и systemd
2. [ ] Пересмотреть принятые риски через 90 дней (2026-08-10) — проверить статус патчей
3. [ ] Рассмотреть `gcr.io/distroless/python3` как долгосрочную альтернативу для минимальной OS-поверхности атаки (после проверки совместимости с psycopg/cryptography)
4. [ ] Добавить автоматическое уведомление (GitHub Dependabot или Renovate) при появлении патчей для принятых CVE

---

## Сводка по инструментам

| Инструмент | Версия | Конфигурация | Результат |
|------------|--------|-------------|-----------|
| Bandit | 1.8.3 | `-lll` (block on HIGH) | PASSED — 0 находок |
| pip-audit | latest | `requirements.txt` | PASSED — 0 CVE |
| npm audit | Node 22 | `--audit-level=high` | PASSED — 0 HIGH+ CVE |
| Trivy FS | latest | `ignore-unfixed: true` | PASSED — 0 fixable CVE |
| Trivy Image | latest | `ignore-unfixed: true` | PASSED — 0 fixable CVE |
| Gitleaks | v8.27.2 | кастомные правила + allowlist | PASSED — 0 secrets |
| Syft | v0 | CycloneDX JSON | 766 компонентов, 0 CVE |
