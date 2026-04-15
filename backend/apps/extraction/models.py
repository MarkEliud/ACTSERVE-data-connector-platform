from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid

User = get_user_model()


class ExtractionJob(models.Model):
    """Data extraction job configuration"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    # Basic information
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    connection = models.ForeignKey(
        'connections.ConnectionConfig',
        on_delete=models.CASCADE,
        related_name='extraction_jobs'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Extraction configuration
    table_name = models.CharField(max_length=255)
    schema_name = models.CharField(max_length=255, blank=True)
    columns = models.JSONField(default=list, blank=True, help_text="List of columns to extract, empty for all")
    query = models.TextField(blank=True, help_text="Custom SQL query (overrides table extraction)")
    filters = models.JSONField(default=dict, blank=True, help_text="Filter conditions")
    
    # Batch configuration
    batch_size = models.IntegerField(
        default=1000,
        validators=[MinValueValidator(1), MaxValueValidator(100000)]
    )
    
    # Metadata
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='extraction_jobs'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Statistics
    total_rows = models.IntegerField(default=0)
    total_batches = models.IntegerField(default=0)
    failed_batches = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'extraction_jobs'
        verbose_name = 'Extraction Job'
        verbose_name_plural = 'Extraction Jobs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.get_status_display()}"
    
    def start_extraction(self):
        """Start the extraction process"""
        from .services.extractor import ExtractorService
        
        self.status = 'running'
        self.save()
        
        try:
            extractor = ExtractorService(self)
            extractor.process()
        except Exception as e:
            self.status = 'failed'
            self.save()
            raise
    
    def cancel(self):
        """Cancel the extraction job"""
        self.status = 'cancelled'
        self.save()
    
    @property
    def progress_percentage(self):
        """Calculate extraction progress percentage"""
        if self.total_rows == 0:
            return 0
        
        completed_rows = self.batches.filter(status='completed').aggregate(
            total=models.Sum('row_count')
        )['total'] or 0
        
        return int((completed_rows / self.total_rows) * 100)


class ExtractionBatch(models.Model):
    """Batch of extracted data"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    job = models.ForeignKey(
        ExtractionJob,
        on_delete=models.CASCADE,
        related_name='batches'
    )
    batch_number = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    row_count = models.IntegerField(default=0)
    offset = models.IntegerField(default=0)
    error_message = models.TextField(blank=True)
    
    # Data storage
    data = models.JSONField(default=list, blank=True)
    
    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'extraction_batches'
        verbose_name = 'Extraction Batch'
        verbose_name_plural = 'Extraction Batches'
        ordering = ['job', 'batch_number']
        unique_together = ['job', 'batch_number']
    
    def __str__(self):
        return f"Batch {self.batch_number} - {self.job.name}"
    
    def process(self):
        """Process this batch"""
        from .services.batch_processor import BatchProcessor
        
        self.status = 'processing'
        self.started_at = timezone.now()
        self.save()
        
        try:
            processor = BatchProcessor(self)
            processor.process()
            
            self.status = 'completed'
            self.completed_at = timezone.now()
            self.save()
        except Exception as e:
            self.status = 'failed'
            self.error_message = str(e)
            self.save()
            raise


class ExtractionResult(models.Model):
    """Individual extracted data row"""
    
    job = models.ForeignKey(
        ExtractionJob,
        on_delete=models.CASCADE,
        related_name='results'
    )
    batch = models.ForeignKey(
        ExtractionBatch,
        on_delete=models.CASCADE,
        related_name='results',
        null=True,
        blank=True
    )
    row_number = models.IntegerField()
    data = models.JSONField()
    is_modified = models.BooleanField(default=False)
    modified_data = models.JSONField(default=dict, blank=True)
    validation_errors = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'extraction_results'
        verbose_name = 'Extraction Result'
        verbose_name_plural = 'Extraction Results'
        ordering = ['job', 'row_number']
        indexes = [
            models.Index(fields=['job', 'row_number']),
            models.Index(fields=['is_modified']),
        ]
    
    def __str__(self):
        return f"Row {self.row_number} - {self.job.name}"