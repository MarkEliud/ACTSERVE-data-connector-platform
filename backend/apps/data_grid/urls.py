from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'data_grid'

router = DefaultRouter()
router.register(r'datasets', views.DataSetViewSet, basename='dataset')
router.register(r'rows', views.DataRowViewSet, basename='row')

urlpatterns = [
    path('', include(router.urls)),
]