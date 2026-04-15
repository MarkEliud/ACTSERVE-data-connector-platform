from django.db import models
from django.contrib.auth import get_user_model
from apps.extraction.models import ExtractionJob

User = get_user_model()

class DataSet(models.Model):
    """
    Container for extracted data ready for editing.
    Each extraction job creates one dataset.
    """
    name = models.CharField(max_length=200)
    extraction_job = models.OneToOneField(
        ExtractionJob,
        on_delete=models.CASCADE,
        related_name='dataset'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_datasets'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'data_sets'
        verbose_name = 'Data Set'
        verbose_name_plural = 'Data Sets'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def row_count(self):
        """Get total number of rows in dataset"""
        return self.rows.count()

    @property
    def modified_count(self):
        """Get number of modified rows"""
        return self.rows.filter(is_modified=True).count()

    @property
    def invalid_count(self):
        """Get number of invalid rows"""
        return self.rows.filter(is_valid=False).count()

    def get_statistics(self):
        """Get dataset statistics"""
        return {
            'total_rows': self.row_count,
            'modified_rows': self.modified_count,
            'invalid_rows': self.invalid_count,
            'valid_rows': self.row_count - self.invalid_count
        }


class DataRow(models.Model):
    """
    Individual row in the editable grid.
    Stores both original and current (edited) data.
    """
    dataset = models.ForeignKey(
        DataSet,
        on_delete=models.CASCADE,
        related_name='rows'
    )
    row_number = models.IntegerField(help_text="Row number in the dataset")
    batch_number = models.IntegerField(help_text="Batch number this row came from")
    original_data = models.JSONField(
        help_text="Original extracted data (read-only)"
    )
    current_data = models.JSONField(
        help_text="Current data after edits"
    )
    is_modified = models.BooleanField(
        default=False,
        help_text="Whether this row has been modified"
    )
    is_valid = models.BooleanField(
        default=True,
        help_text="Whether current data passes validation"
    )
    validation_errors = models.JSONField(
        default=dict,
        blank=True,
        help_text="Validation error messages by field"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'data_rows'
        verbose_name = 'Data Row'
        verbose_name_plural = 'Data Rows'
        ordering = ['row_number']
        indexes = [
            models.Index(fields=['dataset', 'is_modified']),
            models.Index(fields=['dataset', 'is_valid']),
            models.Index(fields=['batch_number']),
        ]

    def __str__(self):
        return f"Row {self.row_number} - {self.dataset.name}"

    def update_data(self, new_data: dict, validate: bool = True):
        """
        Update row data with validation.
        
        Args:
            new_data: New data dictionary
            validate: Whether to run validation
            
        Returns:
            tuple: (success, errors)
        """
        from .validation import validate_row_data
        
        if validate:
            is_valid, errors = validate_row_data(new_data, self.original_data)
            self.is_valid = is_valid
            self.validation_errors = errors
        else:
            self.is_valid = True
            self.validation_errors = {}
        
        self.current_data = new_data
        self.is_modified = True
        self.save()
        
        return self.is_valid, self.validation_errors

    def revert_changes(self):
        """Revert row to original data"""
        self.current_data = self.original_data.copy()
        self.is_modified = False
        self.is_valid = True
        self.validation_errors = {}
        self.save()

    def get_changes(self):
        """Get dictionary of changed fields"""
        changes = {}
        for key in self.original_data.keys():
            if self.current_data.get(key) != self.original_data.get(key):
                changes[key] = {
                    'original': self.original_data.get(key),
                    'current': self.current_data.get(key)
                }
        return changes