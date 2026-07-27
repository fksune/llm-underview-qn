# Stage 1: Build frontend
FROM node:24-alpine AS frontend
RUN npm install -g bun

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
RUN bun install --frozen-lockfile

COPY apps/web/ ./apps/web/
RUN cd apps/web && bun run build

# Stage 2: Python backend
FROM python:3.13-slim
WORKDIR /app

RUN pip install --no-cache-dir uv

COPY apps/api/ ./
RUN uv sync --no-dev --frozen

COPY --from=frontend /app/apps/web/build/client ./static

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]