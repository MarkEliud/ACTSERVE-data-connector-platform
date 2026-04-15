from django.contrib import admin
from .models import DataSet, DataRow

class DataSetAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'extraction_job', 'created_by', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('name', 'extraction_job__name', 'created_by__email')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'extraction_job', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

class DataRowAdmin(admin.ModelAdmin):
    list_display = ('id', 'dataset', 'row_number', 'batch_number', 'is_modified', 'is_valid', 'updated_at')
    list_filter = ('is_modified', 'is_valid', 'batch_number', 'updated_at')
    search_fields = ('dataset__name', 'row_number')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Row Information', {
            'fields': ('dataset', 'row_number', 'batch_number')
        }),
        ('Data', {
            'fields': ('original_data', 'current_data'),
            'classes': ('collapse',)
        }),
        ('Validation', {
            'fields': ('is_modified', 'is_valid', 'validation_errors'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

admin.site.register(DataSet, DataSetAdmin)
admin.site.register(DataRow, DataRowAdmin)