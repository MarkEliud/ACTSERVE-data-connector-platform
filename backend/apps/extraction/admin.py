from django.contrib import admin
from .models import ExtractionJob, ExtractionBatch, ExtractionResult

class ExtractionJobAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'connection', 'status', 'batch_size', 'created_by', 'created_at')
    list_filter = ('status', 'connection__database_type', 'created_at')
    search_fields = ('name', 'connection__name', 'created_by__email')
    readonly_fields = ('created_at', 'updated_at', 'completed_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'connection', 'status')
        }),
        ('Extraction Configuration', {
            'fields': ('table_name', 'schema_name', 'columns', 'query', 'batch_size')
        }),
        ('Filters', {
            'fields': ('filters',),
            'classes': ('collapse',)
        }),
        ('Timing', {
            'fields': ('created_by', 'created_at', 'updated_at', 'completed_at'),
            'classes': ('collapse',)
        })
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        obj.save()

class ExtractionBatchAdmin(admin.ModelAdmin):
    list_display = ('id', 'job', 'batch_number', 'status', 'row_count', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('job__name',)
    readonly_fields = ('created_at',)

class ExtractionResultAdmin(admin.ModelAdmin):
    list_display = ('id', 'job', 'batch', 'row_number', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('job__name',)
    readonly_fields = ('created_at',)

admin.site.register(ExtractionJob, ExtractionJobAdmin)
admin.site.register(ExtractionBatch, ExtractionBatchAdmin)
admin.site.register(ExtractionResult, ExtractionResultAdmin)