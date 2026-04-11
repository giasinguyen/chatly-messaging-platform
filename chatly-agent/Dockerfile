# ─── Stage 1: dependency builder ──────────────────────────────────────────────
FROM python:3.12-slim AS builder

# Copy uv binary từ official image — không cần cài qua pip
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Build deps cần thiết cho các package có C-extension (cryptography, pymongo, bcrypt)
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy chỉ dependency files trước — tận dụng Docker layer cache
COPY pyproject.toml uv.lock ./

# Cài production deps vào .venv, không cài dev deps, không cài project package
RUN uv sync --frozen --no-dev --no-install-project

# ─── Stage 2: runtime image ───────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Không chạy app với root
RUN useradd --create-home --no-log-init --shell /bin/bash appuser

WORKDIR /app

# Copy virtual environment đã build từ builder stage
COPY --from=builder /app/.venv /app/.venv

# Copy application source code (không copy tests/, AGENTS.md, docker-compose, v.v.)
COPY app/ ./app/

# Chuyển ownership cho non-root user
RUN chown -R appuser:appuser /app

USER appuser

# Thêm .venv vào PATH — không cần activate
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
