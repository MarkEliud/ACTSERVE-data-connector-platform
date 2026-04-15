from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import ConnectionTestView

app_name = 'connections'

# Create router
router = DefaultRouter()
router.register(r'', views.ConnectionViewSet, basename='connection')
router.register(r'test-results', views.ConnectionTestResultViewSet, basename='test-result')
router.register(r'history', views.ConnectionHistoryViewSet, basename='history')

urlpatterns = [
    # !! These explicit paths MUST come before include(router.urls) !!
    # The router treats any word as a pk and would intercept 'test/' and 'supported-types/'
    path('test/', ConnectionTestView.as_view(), name='connection-test'),
    path('supported-types/', views.get_supported_types, name='supported-types'),

    # Router URLs last so explicit paths always take priority
    path('', include(router.urls)),
]