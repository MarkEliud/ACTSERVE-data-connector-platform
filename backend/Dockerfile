# =============================================================================
# Multi-stage Dockerfile for Django Backend
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Base Python image with system dependencies
# -----------------------------------------------------------------------------
FROM python:3.11-slim-bookworm AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libpq-dev \
    default-libmysqlclient-dev \
    pkg-config \
    libssl-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app directory and user
WORKDIR /app
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app

# -----------------------------------------------------------------------------
# Stage 2: Dependencies installation
# -----------------------------------------------------------------------------
FROM base AS dependencies

# Copy requirements first for better caching
COPY --chown=appuser:appuser requirements/ ./requirements/

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements/base.txt

# -----------------------------------------------------------------------------
# Stage 3: Development image
# -----------------------------------------------------------------------------
FROM dependencies AS development

# Install development dependencies
RUN pip install -r requirements/dev.txt

# Copy project files
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

# Default command for development
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# -----------------------------------------------------------------------------
# Stage 4: Production build
# -----------------------------------------------------------------------------
FROM dependencies AS production

# Copy project files
COPY --chown=appuser:appuser . .

# Collect static files
RUN python manage.py collectstatic --noinput --clear

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

# Production command with Gunicorn
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--worker-class", "gthread", \
     "--threads", "4", \
     "--timeout", "120", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "50", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info"]