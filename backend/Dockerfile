FROM python:3.12-slim

WORKDIR /app

# Install system deps: gcc for asyncpg, libpq for psycopg, chromium for Playwright
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer-cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright Chromium (needed for scraping).
# Installed as root (build time) but the app runs as appuser (runtime) — point
# both at a shared, world-readable path so appuser can actually find the browser.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN python3 -m playwright install chromium --with-deps && \
    chmod -R a+rX /ms-playwright

# Cache-bust arg — pass --build-arg CACHE_BUST=$(date +%s) to force re-copy of migrations
ARG CACHE_BUST=1

# Copy application code
COPY app/ ./app/
COPY migrations/ ./migrations/
COPY alembic.ini .
COPY start.sh .
RUN chmod +x start.sh

# Strip macOS AppleDouble resource fork files (._*) that corrupt Python imports
RUN find /app -name "._*" -delete && find /app -name ".DS_Store" -delete

# Non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# start.sh runs migrations then uvicorn
CMD ["bash", "start.sh"]
