from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'storage'

router = DefaultRouter()
router.register(r'records', views.StoredRecordViewSet, basename='record')
router.register(r'exports', views.FileExportViewSet, basename='export')

urlpatterns = [
    path('', include(router.urls)),
    path('exports/<int:export_id>/download/', views.FileExportDownloadView.as_view(), name='export-download'),
    path('exports/<int:export_id>/share/', views.FileShareView.as_view(), name='export-share'),
    path('exports/<int:export_id>/revoke/', views.FileRevokeView.as_view(), name='export-revoke'),
    path('exports/<int:export_id>/shares/', views.FileSharesListView.as_view(), name='export-shares'),  # ADD THIS LINE
    path('exports/<int:export_id>/metadata/', views.FileMetadataView.as_view(), name='export-metadata'),
    path('cleanup/', views.CleanupExpiredFilesView.as_view(), name='cleanup'),
]