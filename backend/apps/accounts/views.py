from rest_framework import viewsets, generics, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import logout
from .models import User
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer
)
from core.permissions import IsAdmin


class UserViewSet(viewsets.ModelViewSet):
    """User management viewset"""
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'list', 'destroy']:
            self.permission_classes = [IsAdmin]
        elif self.action in ['update', 'partial_update']:
            self.permission_classes = [IsAdmin]
        else:
            self.permission_classes = [permissions.IsAuthenticated]
        return super().get_permissions()
    
    def get_queryset(self):
        if self.request.user.is_admin:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)
    
    @action(detail=True, methods=['post'])
    def set_role(self, request, pk=None):
        user = self.get_object()
        role = request.data.get('role')
        
        if role not in ['admin', 'user']:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not request.user.is_admin:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        user.is_admin = (role == 'admin')
        user.save()
        return Response({'status': 'role updated'})


class RegisterView(generics.CreateAPIView):
    """User registration view"""
    
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    """User login view"""
    
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })


class LogoutView(generics.GenericAPIView):
    """User logout view"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            logout(request)
            return Response({'message': 'Successfully logged out'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(generics.RetrieveUpdateAPIView):
    """Get current authenticated user"""
    
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class ChangePasswordView(generics.UpdateAPIView):
    """Change user password"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def update(self, request, *args, **kwargs):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        
        if not user.check_password(old_password):
            return Response({'error': 'Old password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(new_password)
        user.save()
        
        return Response({'message': 'Password updated successfully'})