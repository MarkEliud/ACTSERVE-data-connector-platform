from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'extraction'

router = DefaultRouter()
router.register(r'jobs', views.ExtractionJobViewSet, basename='job')
router.register(r'batches', views.ExtractionBatchViewSet, basename='batch')
router.register(r'results', views.ExtractionResultViewSet, basename='result')

urlpatterns = [
    # Explicit paths before router to avoid conflicts
    path('start/', views.StartExtractionView.as_view(), name='start-extraction'),
    path('progress/<int:job_id>/', views.ExtractionProgressView.as_view(), name='extraction-progress'),
    path('cancel/<int:job_id>/', views.CancelExtractionView.as_view(), name='cancel-extraction'),

    # Router URLs (jobs/, batches/, results/ and their actions)
    path('', include(router.urls)),
]