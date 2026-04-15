"""
URL configuration for Data Connector Platform project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView
)

# API Documentation Schema
schema_view = get_schema_view(
    openapi.Info(
        title="Data Connector Platform API",
        default_version='v1',
        description="API documentation for Data Connector Platform",
        terms_of_service="https://www.test.com/terms/",
        contact=openapi.Contact(email="support@test.com"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # API Documentation
    path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('api/docs.json', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    
    # API endpoints
    path('api/auth/', include('apps.accounts.urls')),
    path('api/connections/', include('apps.connections.urls')),
    path('api/extraction/', include('apps.extraction.urls')),
    path('api/grid/', include('apps.data_grid.urls')),
    path('api/storage/', include('apps.storage.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
]   

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)