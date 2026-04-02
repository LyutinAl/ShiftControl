FROM python:3.14-slim

WORKDIR /app

# Устанавливаем зависимости отдельным слоем — Docker кэширует его
# пока requirements.txt не изменится
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout=120 \
    --trusted-host pypi.org \
    --trusted-host pypi.python.org \
    --trusted-host files.pythonhosted.org \
    -r requirements.txt

# Копируем исходный код
COPY . .

# Создаём папку для медиафайлов
RUN mkdir -p media/wiki

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# entrypoint.sh сначала прогоняет миграции, потом запускает сервер
ENTRYPOINT ["./entrypoint.sh"]
