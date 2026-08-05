FROM python:3.13-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Copiar so o pyproject antes do codigo faz a camada de dependencias ser
# reaproveitada entre builds: mexer no codigo nao reinstala tudo de novo.
COPY pyproject.toml ./
RUN pip install --upgrade pip && pip install .

COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app

# Processo nao-root: se o container for comprometido, o atacante nao herda root.
RUN useradd --create-home --uid 1000 grudado && chown -R grudado:grudado /app
USER grudado

EXPOSE 8000

# 1 worker de proposito: o hub de WebSocket e in-memory e nao faz broadcast entre
# processos. Para ~15 pessoas um worker sobra. Ver "Tempo real" no README antes
# de aumentar isso -- subir para 2 quebraria a atualizacao ao vivo do board.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
