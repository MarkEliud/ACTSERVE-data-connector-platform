from django.contrib import admin
from .models import ConnectionConfig, ConnectionTestResult, ConnectionHistory

class ConnectionConfigAdmin(admin.ModelAdmin):
    list_display = ('name', 'database_type', 'host', 'port', 'user', 'is_active', 'created_at')
    list_filter = ('database_type', 'is_active', 'created_at')
    search_fields = ('name', 'host', 'database_name')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'database_type', 'is_active')
        }),
        ('Connection Details', {
            'fields': ('host', 'port', 'database_name', 'user', 'password')
        }),
        ('Advanced Settings', {
            'fields': ('options', 'connection_timeout', 'max_connections'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # New object
            obj.created_by = request.user
        obj.save()

class ConnectionTestResultAdmin(admin.ModelAdmin):
    list_display = ('connection', 'is_successful', 'response_time_ms', 'tested_at')
    list_filter = ('is_successful', 'tested_at')
    search_fields = ('connection__name', 'error_message')
    readonly_fields = ('tested_at',)

class ConnectionHistoryAdmin(admin.ModelAdmin):
    list_display = ('connection', 'action', 'status', 'performed_by', 'performed_at')
    list_filter = ('action', 'status', 'performed_at')
    search_fields = ('connection__name', 'performed_by__email')
    readonly_fields = ('performed_at',)

admin.site.register(ConnectionConfig, ConnectionConfigAdmin)
admin.site.register(ConnectionTestResult, ConnectionTestResultAdmin)
admin.site.register(ConnectionHistory, ConnectionHistoryAdmin)