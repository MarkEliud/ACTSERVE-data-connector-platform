import logging
from typing import Dict, Any, List
from django.utils import timezone
from apps.extraction.models import ExtractionJob
from apps.storage.models import StoredRecord

logger = logging.getLogger(__name__)

class DatabaseStorageService:
    """
    Service for storing extracted data in the database.
    Handles validation and structured storage.
    """

    def __init__(self, job: ExtractionJob):
        self.job = job
        self.storage_count = 0
        self.error_count = 0

    def store_records(self, records: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Store multiple records in the database.

        Args:
            records: List of record dictionaries with 'data' and 'row_number'

        Returns:
            Dictionary with storage statistics
        """
        logger.info(f"Storing {len(records)} records for job {self.job.id}")

        stored_records = []
        for record in records:
            try:
                stored_record = self._store_single_record(record)
                stored_records.append(stored_record)
                self.storage_count += 1
            except Exception as e:
                logger.error(f"Failed to store record: {e}")
                self.error_count += 1

        # Bulk create for efficiency
        if stored_records:
            StoredRecord.objects.bulk_create(stored_records, batch_size=1000)

        return {
            'stored': self.storage_count,
            'errors': self.error_count,
            'total': len(records)
        }

    def _store_single_record(self, record: Dict[str, Any]) -> StoredRecord:
        """
        Store a single record in the database.

        Args:
            record: Record dictionary with data and metadata

        Returns:
            Created StoredRecord instance
        """
        return StoredRecord(
            job=self.job,
            row_number=record.get('row_number', 0),
            data=record.get('current_data', record.get('data', {})),
            original_data=record.get('original_data', record.get('data', {})),
            is_modified=record.get('is_modified', False),
            validation_status=record.get('validation_status', 'valid')
        )

    def update_record(self, row_number: int, data: Dict[str, Any]) -> StoredRecord:
        """
        Update an existing record.

        Args:
            row_number: Row number to update
            data: New data dictionary

        Returns:
            Updated StoredRecord instance
        """
        try:
            record = StoredRecord.objects.get(
                job=self.job,
                row_number=row_number
            )
            record.data = data
            record.is_modified = True
            record.validation_status = 'valid'
            record.updated_at = timezone.now()
            record.save()
            return record
        except StoredRecord.DoesNotExist:
            raise ValueError(f"Record {row_number} not found for job {self.job.id}")

    def get_records(self, filters: Dict[str, Any] = None) -> List[StoredRecord]:
        """
        Get stored records with optional filters.

        Args:
            filters: Dictionary of filter criteria

        Returns:
            List of StoredRecord instances
        """
        queryset = StoredRecord.objects.filter(job=self.job)

        if filters:
            if 'validation_status' in filters:
                queryset = queryset.filter(validation_status=filters['validation_status'])
            if 'is_modified' in filters:
                queryset = queryset.filter(is_modified=filters['is_modified'])
            if 'row_number__gte' in filters:
                queryset = queryset.filter(row_number__gte=filters['row_number__gte'])
            if 'row_number__lte' in filters:
                queryset = queryset.filter(row_number__lte=filters['row_number__lte'])

        return list(queryset.order_by('row_number'))

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get storage statistics for the job.

        Returns:
            Dictionary with storage statistics
        """
        from django.db.models import Count, Q

        stats = StoredRecord.objects.filter(job=self.job).aggregate(
            total=Count('id'),
            modified=Count('id', filter=Q(is_modified=True)),
            valid=Count('id', filter=Q(validation_status='valid')),
            invalid=Count('id', filter=Q(validation_status='invalid'))
        )

        return {
            'job_id': self.job.id,
            'total_records': stats['total'] or 0,
            'modified_records': stats['modified'] or 0,
            'valid_records': stats['valid'] or 0,
            'invalid_records': stats['invalid'] or 0,
            'storage_count': self.storage_count,
            'error_count': self.error_count
        }

    def delete_records(self, row_numbers: List[int] = None) -> int:
        """
        Delete records from storage.

        Args:
            row_numbers: Optional list of row numbers to delete

        Returns:
            Number of deleted records
        """
        queryset = StoredRecord.objects.filter(job=self.job)

        if row_numbers:
            queryset = queryset.filter(row_number__in=row_numbers)

        count = queryset.count()
        queryset.delete()

        return count