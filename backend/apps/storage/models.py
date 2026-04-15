from django.db import models
from django.contrib.auth import get_user_model
from apps.extraction.models import ExtractionJob
import os

User = get_user_model()

class StoredRecord(models.Model):
    """
    Structured storage in database for extracted and processed data.
    Each record represents a row that has been validated and stored.
    """
    job = models.ForeignKey(
        ExtractionJob,
        on_delete=models.CASCADE,
        related_name='stored_records'
    )
    row_number = models.IntegerField(
        help_text="Original row number from extraction"
    )
    data = models.JSONField(
        help_text="Stored data after validation and processing"
    )
    original_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Original extracted data for audit trail"
    )
    is_modified = models.BooleanField(
        default=False,
        help_text="Whether data was modified before storage"
    )
    validation_status = models.CharField(
        max_length=20,
        choices=[
            ('valid', 'Valid'),
            ('invalid', 'Invalid'),
            ('pending', 'Pending'),
        ],
        default='valid'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'stored_records'
        verbose_name = 'Stored Record'
        verbose_name_plural = 'Stored Records'
        ordering = ['job', 'row_number']
        indexes = [
            models.Index(fields=['job', 'row_number']),
            models.Index(fields=['job', 'validation_status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Record {self.row_number} - Job {self.job.id}"

    @property
    def file_name(self):
        """Generate unique file name for this record"""
        return f"record_{self.job.id}_{self.row_number}.json"


class FileExport(models.Model):
    """
    File-based storage for exported data (JSON/CSV).
    Includes metadata for audit and tracking purposes.
    """
    FORMAT_CHOICES = [
        ('json', 'JSON'),
        ('csv', 'CSV'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    # Basic information
    job = models.ForeignKey(
        ExtractionJob,
        on_delete=models.CASCADE,
        related_name='file_exports'
    )
    file_format = models.CharField(
        max_length=10,
        choices=FORMAT_CHOICES,
        default='json'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    # File details
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.BigIntegerField(default=0)
    file_hash = models.CharField(
        max_length=64,
        blank=True,
        help_text="SHA256 hash for integrity verification"
    )

    # Metadata
    metadata = models.JSONField(
        default=dict,
        help_text="Export metadata including timestamp, source, etc."
    )

    # Access control
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_exports'
    )
    is_public = models.BooleanField(
        default=False,
        help_text="Whether file is accessible to all users"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Optional expiration date for file"
    )

    class Meta:
        db_table = 'file_exports'
        verbose_name = 'File Export'
        verbose_name_plural = 'File Exports'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['job', 'created_at']),
            models.Index(fields=['created_by', 'created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['is_public']),
        ]

    def __str__(self):
        return f"{self.file_name} ({self.get_file_format_display()})"

    @property
    def file_extension(self):
        """Get file extension based on format"""
        return f".{self.file_format}"

    @property
    def is_expired(self):
        """Check if file has expired"""
        if self.expires_at is None:
            return False
        from django.utils import timezone
        return timezone.now() > self.expires_at

    @property
    def download_url(self):
        """Generate download URL for the file"""
        return f"/api/storage/exports/{self.id}/download/"

    def delete_file(self):
        """Delete the physical file from storage"""
        if self.file_path and os.path.exists(self.file_path):
            try:
                os.remove(self.file_path)
            except OSError:
                pass

    def get_access_permissions(self, user):
        """Check if user has access to this file"""
        if user.is_admin:
            return True
        if self.created_by == user:
            return True
        if self.is_public:
            return True
        # Check if file was shared with user
        from apps.accounts.models import FileShare
        return FileShare.objects.filter(
            file_path=self.file_path,
            shared_with=user
        ).exists()