from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model
from django.utils import timezone
import json

User = get_user_model()


class ConnectionConfig(models.Model):
    """Database connection configuration model"""
    
    DATABASE_TYPES = [
        ('postgresql', 'PostgreSQL'),
        ('mysql', 'MySQL'),
        ('mongodb', 'MongoDB'),
        ('clickhouse', 'ClickHouse'),
    ]
    
    # Basic information
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    database_type = models.CharField(max_length=20, choices=DATABASE_TYPES)
    is_active = models.BooleanField(default=True)  # Whether connection works/ is tested
    is_public = models.BooleanField(default=False)  # Whether other users can see it
    
    # Connection details
    host = models.CharField(max_length=255)
    port = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(65535)]
    )
    database_name = models.CharField(max_length=255)
    user = models.CharField(max_length=255)
    password = models.CharField(max_length=500)  # Will be encrypted
    
    # Advanced settings
    options = models.JSONField(default=dict, blank=True)
    connection_timeout = models.IntegerField(
        default=30,
        validators=[MinValueValidator(1), MaxValueValidator(300)],
        help_text="Connection timeout in seconds"
    )
    max_connections = models.IntegerField(
        default=10,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Maximum number of connections in pool"
    )
    
    # Metadata
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_connections'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'connection_configs'
        verbose_name = 'Connection Configuration'
        verbose_name_plural = 'Connection Configurations'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.get_database_type_display()})"
    
    def get_connection_params(self):
        """Get connection parameters as dictionary"""
        return {
            'host': self.host,
            'port': self.port,
            'database': self.database_name,
            'user': self.user,
            'password': self.password,
            'timeout': self.connection_timeout,
            'max_connections': self.max_connections,
            **self.options
        }
    
    def test_connection(self):
        """Test if connection is valid"""
        from apps.connections.connectors.registry import ConnectorRegistry
        
        try:
            connector_class = ConnectorRegistry.get(self.database_type)
            connector = connector_class(self.get_connection_params())
            result = connector.test_connection()
            
            # Save test result
            ConnectionTestResult.objects.create(
                connection=self,
                is_successful=result['success'],
                response_time_ms=result.get('response_time', 0),
                error_message=result.get('error', ''),
                details=result.get('details', {})
            )
            
            # Update is_active based on test result
            self.is_active = result['success']
            self.save(update_fields=['is_active'])
            
            return result
        except Exception as e:
            ConnectionTestResult.objects.create(
                connection=self,
                is_successful=False,
                error_message=str(e)
            )
            self.is_active = False
            self.save(update_fields=['is_active'])
            return {'success': False, 'error': str(e)}


class ConnectionTestResult(models.Model):
    """Store connection test results"""
    
    connection = models.ForeignKey(
        ConnectionConfig,
        on_delete=models.CASCADE,
        related_name='test_results'
    )
    is_successful = models.BooleanField()
    response_time_ms = models.IntegerField(default=0)
    error_message = models.TextField(blank=True)
    details = models.JSONField(default=dict, blank=True)
    tested_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'connection_test_results'
        verbose_name = 'Connection Test Result'
        verbose_name_plural = 'Connection Test Results'
        ordering = ['-tested_at']
    
    def __str__(self):
        status = "Success" if self.is_successful else "Failed"
        return f"{self.connection.name} - {status} at {self.tested_at}"


class ConnectionHistory(models.Model):
    """Track connection usage history"""
    
    ACTION_CHOICES = [
        ('test', 'Test Connection'),
        ('extract', 'Data Extraction'),
        ('query', 'Query Execution'),
        ('error', 'Error Occurred'),
    ]
    
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('pending', 'Pending'),
    ]
    
    connection = models.ForeignKey(
        ConnectionConfig,
        on_delete=models.CASCADE,
        related_name='history'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    details = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='connection_actions'
    )
    performed_at = models.DateTimeField(auto_now_add=True)
    duration_ms = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'connection_history'
        verbose_name = 'Connection History'
        verbose_name_plural = 'Connection Histories'
        ordering = ['-performed_at']
    
    def __str__(self):
        return f"{self.connection.name} - {self.action} - {self.status}"