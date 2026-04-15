from django.contrib import admin
from .models import StoredRecord, FileExport

class StoredRecordAdmin(admin.ModelAdmin):
    list_display = ('id', 'job', 'row_number', 'created_at')
    list_filter = ('job', 'created_at')
    search_fields = ('job__name', 'row_number')
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

class FileExportAdmin(admin.ModelAdmin):
    list_display = ('id', 'job', 'file_format', 'file_size', 'created_by', 'created_at')
    list_filter = ('file_format', 'created_at', 'job__status')
    search_fields = ('job__name', 'created_by__email', 'file_path')
    readonly_fields = ('created_at', 'file_size', 'metadata')
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'job', 'file_format')
        }),
        ('File Details', {
            'fields': ('file_path', 'file_size')
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',)
        })
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

admin.site.register(StoredRecord, StoredRecordAdmin)
admin.site.register(FileExport, FileExportAdmin)