# Production Deployment Guide

## Overview

This guide covers deploying the Data Connector Platform to a production environment using Docker Compose. The platform runs six service categories: the application database (PostgreSQL), extraction source databases (MySQL, MongoDB, ClickHouse), the cache/broker (Redis), the Django backend, Celery workers, and the Next.js frontend.

---

## Prerequisites

- Docker 24+ and Docker Compose v2+
- A Linux server (Ubuntu 22.04+ recommended)
- Domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)
- At least 4 GB RAM, 2 CPU cores, 20 GB disk

---

## Environment Configuration

Copy the example environment file and configure all required values:

```bash
cp .env.example .env
```

### Required Variables

```env
# Django
DJANGO_SECRET_KEY=<generate a strong random key>
DJANGO_DEBUG=false
DJANGO_SETTINGS_MODULE=config.settings_production

# PostgreSQL (application database)
DB_NAME=connector_db
DB_USER=connector_user
DB_PASSWORD=<strong password>

# MySQL (extraction source)
MYSQL_ROOT_PASSWORD=<strong password>
MYSQL_DATABASE=data_connector
MYSQL_USER=appuser
MYSQL_PASSWORD=<strong password>

# MongoDB (extraction source)
MONGO_USER=root
MONGO_PASSWORD=<strong password>
MONGO_DATABASE=test_db

# ClickHouse (extraction source)
CLICKHOUSE_DB=default
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=<strong password>

# Redis
REDIS_URL=redis://redis:6379/0
REDIS_CACHE_URL=redis://redis:6379/1

# Frontend
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### Generating a Django Secret Key

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

---

## Production Settings

Create `backend/config/settings_production.py` extending the base settings with:

```python
from config.settings import *

DEBUG = False
ALLOWED_HOSTS = ['api.yourdomain.com', 'yourdomain.com']

# Security headers
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# CORS
CORS_ALLOWED_ORIGINS = [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
]

# Static and media files
STATIC_ROOT = '/app/staticfiles'
MEDIA_ROOT = '/app/media'

# Logging — production level
LOGGING['root']['level'] = 'WARNING'
```

---

## Docker Compose Production Setup

The `docker-compose.yml` defines all services. For production, override with a `docker-compose.prod.yml`:

```yaml
# docker-compose.prod.yml
services:
  backend:
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4 --timeout 120
    environment:
      DJANGO_SETTINGS_MODULE: config.settings_production

  frontend:
    environment:
      NODE_ENV: production
```

Start with:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Service Healthchecks

All services include Docker healthchecks. Check status with:

```bash
docker compose ps
```

Expected healthy services: `postgres`, `redis`, `mysql`, `mongodb`, `clickhouse`, `backend`, `celery`, `celery-beat`, `frontend`.

---

## First-Time Setup

Run these commands after the containers are healthy:

```bash
# Apply database migrations
docker compose exec backend python manage.py migrate

# Collect static files
docker compose exec backend python manage.py collectstatic --noinput

# Create a superuser (admin account)
docker compose exec backend python manage.py createsuperuser
```

---

## Nginx Configuration

Configure Nginx as a reverse proxy in front of the Docker services:

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    client_max_body_size 100M;

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /media/ {
        alias /path/to/app/media/;
        expires 30d;
    }

    location /static/ {
        alias /path/to/app/staticfiles/;
        expires 30d;
    }
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Redirect HTTP to HTTPS:

```nginx
server {
    listen 80;
    server_name yourdomain.com api.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

---

## SSL Certificate (Let's Encrypt)

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

Configure auto-renewal:

```bash
crontab -e
# Add:
0 12 * * * certbot renew --quiet
```

---

## Celery Workers

The `docker-compose.yml` includes two Celery services:

**`celery`** — processes extraction tasks:
```bash
celery -A config worker -l info --without-gossip --without-mingle --without-heartbeat
```

**`celery-beat`** — runs scheduled tasks using `django_celery_beat.schedulers:DatabaseScheduler`.

Scale workers based on load:
```bash
docker compose up -d --scale celery=3
```

---

## Volume Management

Persistent data is stored in named Docker volumes:

| Volume | Contents |
|--------|----------|
| `postgres_data` | Application database |
| `mysql_data` | MySQL source data |
| `mongodb_data` | MongoDB source data |
| `clickhouse_data` | ClickHouse source data |
| `redis_data` | Redis persistence |
| `storage_data` | Exported files (`/app/media`) |
| `static_data` | Django static files |

Back up critical volumes:
```bash
docker run --rm \
  -v connector_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres_$(date +%Y%m%d).tar.gz /data
```

---

## Database Backup

### PostgreSQL (Application Database)

```bash
# Backup
docker compose exec postgres pg_dump -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T postgres psql -U $DB_USER $DB_NAME < backup.sql
```

Automate with cron:
```bash
0 2 * * * docker compose -f /path/to/docker-compose.yml exec -T postgres \
  pg_dump -U connector_user connector_db | \
  gzip > /backups/pg_$(date +\%Y\%m\%d).sql.gz
```

---

## Monitoring

### Application Health

```bash
# Check all container status
docker compose ps

# View backend logs
docker compose logs -f backend

# View Celery logs
docker compose logs -f celery

# Django check
docker compose exec backend python manage.py check --deploy
```

### Prometheus Metrics

Expose metrics endpoint in the Django app and configure Prometheus to scrape it. Use Grafana dashboards for visualization.

### Log Rotation

Django logs rotate automatically at 10 MB with 5 backup files (configured in `settings.py`). Ensure the `logs/` directory inside the container has write permissions.

---

## Updating the Application

```bash
# Pull latest images / rebuild
git pull origin main
docker compose build --no-cache backend frontend

# Apply migrations
docker compose exec backend python manage.py migrate

# Collect static files
docker compose exec backend python manage.py collectstatic --noinput

# Restart services (zero-downtime with load balancer)
docker compose up -d --no-deps backend celery celery-beat frontend
```

---

## Security Checklist

Before going live:

- [ ] `DJANGO_SECRET_KEY` is unique and not the development default
- [ ] `DEBUG=false` in production settings
- [ ] All database passwords are strong and unique
- [ ] `ALLOWED_HOSTS` is restricted to your domain
- [ ] CORS origins are restricted to your frontend domain
- [ ] HTTPS enforced via Nginx and `SECURE_SSL_REDIRECT`
- [ ] Security headers configured (`HSTS`, `CSRF`, `SESSION` cookies)
- [ ] Django's deploy check passes: `python manage.py check --deploy`
- [ ] Admin interface is accessible only from a trusted IP or VPN
- [ ] Firewall rules block direct access to container ports (5432, 3306, 27017, 8123, 6379) from the public internet

---

## Troubleshooting

### Backend fails to start
```bash
docker compose logs backend
# Common causes: DB not ready, migration pending, bad SECRET_KEY
```

### Celery tasks not running
```bash
docker compose logs celery
# Check Redis connectivity and CELERY_BROKER_URL
docker compose exec backend celery -A config inspect active
```

### Database connection refused
```bash
# Check container health
docker compose ps
# Verify DB_HOST matches service name in docker-compose.yml (e.g. "postgres")
```

### Static files not serving
```bash
docker compose exec backend python manage.py collectstatic --noinput
# Ensure Nginx aliases match STATIC_ROOT and MEDIA_ROOT
```