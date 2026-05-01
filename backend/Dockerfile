FROM python:3.14-slim AS builder
WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.14-slim AS runtime
WORKDIR /app
RUN useradd -r -u 1001 appuser
COPY --from=builder /install /usr/local
COPY --chown=appuser:root . .
RUN mkdir -p media/wiki && chmod +x entrypoint.sh
USER appuser
EXPOSE 8000
ENTRYPOINT ["./entrypoint.sh"]
