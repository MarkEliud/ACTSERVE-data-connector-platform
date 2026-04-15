"""
Django settings for Data Connector Platform.

This file is the base settings module that imports environment-specific
settings based on DJANGO_SETTINGS_MODULE environment variable.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Determine which settings to use
ENVIRONMENT = os.getenv('DJANGO_ENV', 'development')

if ENVIRONMENT == 'production':
    from .settings_production import *
elif ENVIRONMENT == 'testing':
    from .settings_testing import *
else:
    from .settings_development import *