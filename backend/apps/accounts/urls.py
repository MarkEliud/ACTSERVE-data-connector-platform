from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'accounts'

# Router for viewsets
router = DefaultRouter()
router.register(r'users', views.UserViewSet)

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Authentication endpoints
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('me/', views.CurrentUserView.as_view(), name='current-user'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
]