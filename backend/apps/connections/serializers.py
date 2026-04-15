from rest_framework import serializers
from .models import ConnectionConfig, ConnectionTestResult, ConnectionHistory


class ConnectionConfigSerializer(serializers.ModelSerializer):
    """Serializer for connection configurations"""
    database_type_display = serializers.CharField(source='get_database_type_display', read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    can_toggle_public = serializers.SerializerMethodField()
    
    class Meta:
        model = ConnectionConfig
        fields = [
            'id', 'name', 'description', 'database_type', 'database_type_display',
            'host', 'port', 'database_name', 'user', 'password', 'is_active', 'is_public',
            'options', 'connection_timeout', 'max_connections',
            'created_by', 'created_by_email', 'created_at', 'updated_at',
            'can_edit', 'can_delete', 'can_toggle_public'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'is_active']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }
    
    def get_can_edit(self, obj):
        """Check if current user can edit this connection"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return request.user.is_admin or obj.created_by == request.user
        return False
    
    def get_can_delete(self, obj):
        """Check if current user can delete this connection"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return request.user.is_admin or obj.created_by == request.user
        return False
    
    def get_can_toggle_public(self, obj):
        """Check if current user can toggle public status"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return request.user.is_admin or obj.created_by == request.user
        return False
    
    def create(self, validated_data):
        """Create connection with encrypted password"""
        password = validated_data.pop('password', None)
        instance = super().create(validated_data)
        if password:
            instance.password = password
            instance.save()
        return instance
    
    def update(self, instance, validated_data):
        """Update connection, handle password separately"""
        password = validated_data.pop('password', None)
        instance = super().update(instance, validated_data)
        if password:
            instance.password = password
            instance.save()
        return instance


class ConnectionTestSerializer(serializers.Serializer):
    """Serializer for testing connection"""
    database_type = serializers.ChoiceField(choices=ConnectionConfig.DATABASE_TYPES)
    host = serializers.CharField(max_length=255)
    port = serializers.IntegerField(min_value=1, max_value=65535)
    database_name = serializers.CharField(max_length=255)
    user = serializers.CharField(max_length=255)
    password = serializers.CharField(max_length=500)
    connection_timeout = serializers.IntegerField(min_value=1, max_value=300, required=False, default=30)


class ConnectionTestResultSerializer(serializers.ModelSerializer):
    """Serializer for connection test results"""
    connection_name = serializers.CharField(source='connection.name', read_only=True)
    
    class Meta:
        model = ConnectionTestResult
        fields = [
            'id', 'connection', 'connection_name', 'is_successful',
            'response_time_ms', 'error_message', 'details', 'tested_at'
        ]
        read_only_fields = '__all__'


class ConnectionHistorySerializer(serializers.ModelSerializer):
    """Serializer for connection history"""
    connection_name = serializers.CharField(source='connection.name', read_only=True)
    performed_by_email = serializers.EmailField(source='performed_by.email', read_only=True)
    
    class Meta:
        model = ConnectionHistory
        fields = [
            'id', 'connection', 'connection_name', 'action', 'status',
            'details', 'error_message', 'performed_by', 'performed_by_email',
            'performed_at', 'duration_ms'
        ]
        read_only_fields = '__all__'