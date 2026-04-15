@echo off
echo =========================================
echo Data Connector Platform - Backend Setup
echo =========================================

cd backend 2>nul

echo Creating virtual environment...
python -m venv venv

echo Activating virtual environment...
call venv\Scripts\activate

echo Installing packages...
pip install --upgrade pip
pip install django djangorestframework drf-yasg django-cors-headers djangorestframework-simplejwt
pip install django-filter django-redis hiredis psycopg2-binary python-dotenv
pip install pymongo mysqlclient clickhouse-driver celery redis pillow
pip install django-storages boto3 whitenoise

echo Creating core modules...
if not exist core mkdir core
if not exist core\middleware mkdir core\middleware

echo Creating files...
type nul > core\__init__.py
type nul > core\pagination.py
type nul > core\exceptions.py
type nul > core\middleware.py
type nul > core\middleware\__init__.py
type nul > core\middleware\audit_middleware.py

echo Creating apps...
if not exist apps mkdir apps

set APPS=accounts connections extraction data_grid storage
for %%a in (%APPS%) do (
    if not exist apps\%%a (
        echo Creating app: %%a
        python manage.py startapp %%a apps/
    )
    
    echo Creating signals for %%a...
    echo # signals.py > apps\%%a\signals.py
    echo from django.db.models.signals import post_save, post_delete >> apps\%%a\signals.py
    echo from django.dispatch import receiver >> apps\%%a\signals.py
    
    echo Creating urls for %%a...
    echo from django.urls import path, include > apps\%%a\urls.py
    echo from rest_framework.routers import DefaultRouter >> apps\%%a\urls.py
    echo app_name = '%%a' >> apps\%%a\urls.py
    echo urlpatterns = [] >> apps\%%a\urls.py
)

echo Creating custom user model...
echo from django.contrib.auth.models import AbstractUser > apps\accounts\models.py
echo from django.db import models >> apps\accounts\models.py
echo. >> apps\accounts\models.py
echo class User(AbstractUser): >> apps\accounts\models.py
echo     email = models.EmailField(unique=True) >> apps\accounts\models.py
echo     is_admin = models.BooleanField(default=False) >> apps\accounts\models.py
echo     created_at = models.DateTimeField(auto_now_add=True) >> apps\accounts\models.py
echo     updated_at = models.DateTimeField(auto_now=True) >> apps\accounts\models.py
echo     USERNAME_FIELD = 'email' >> apps\accounts\models.py
echo     REQUIRED_FIELDS = ['username'] >> apps\accounts\models.py

echo Creating .env file...
if not exist .env (
    echo DJANGO_SECRET_KEY=your-secret-key-here > .env
    echo DJANGO_DEBUG=True >> .env
    echo DB_ENGINE=django.db.backends.sqlite3 >> .env
    echo DB_NAME=db.sqlite3 >> .env
)

echo Creating directories...
mkdir media\exports 2>nul
mkdir static 2>nul
mkdir logs 2>nul

echo Creating cache table...
python manage.py createcachetable

echo Running migrations...
python manage.py makemigrations
python manage.py migrate

echo Creating superuser...
python manage.py createsuperuser

echo Collecting static files...
python manage.py collectstatic --noinput

echo.
echo =========================================
echo Setup completed!
echo =========================================
echo.
echo To start the server:
echo   python manage.py runserver
echo.
pause