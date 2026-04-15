import os
import json
import csv
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
from django.conf import settings
from django.utils import timezone
from apps.extraction.models import ExtractionJob
from apps.data_grid.models import DataSet, DataRow
from apps.storage.models import FileExport
from .metadata_builder import MetadataBuilder

logger = logging.getLogger(__name__)

class FileStorageService:
    """
    Service for storing extracted data as files (JSON/CSV).
    Handles file creation, metadata, and integrity verification.
    """

    def __init__(self, export_path: str = None):
        self.export_path = export_path or getattr(
            settings, 'EXPORT_PATH',
            os.path.join(settings.MEDIA_ROOT, 'exports')
        )
        os.makedirs(self.export_path, exist_ok=True)

    def create_export(
        self,
        job_id: int,
        file_format: str = 'json',
        include_modified_only: bool = False,
        user=None,
        expires_in_days: int = None
    ) -> FileExport:
        """
        Create a file export for an extraction job.

        Args:
            job_id: Extraction job ID
            file_format: Export format (json/csv)
            include_modified_only: Only include modified rows
            user: User creating the export
            expires_in_days: Days until file expires

        Returns:
            Created FileExport instance
        """
        job = ExtractionJob.objects.get(id=job_id)

        # Get data from data grid
        try:
            dataset = DataSet.objects.get(extraction_job=job)
            if include_modified_only:
                rows = DataRow.objects.filter(
                    dataset=dataset,
                    is_modified=True
                ).order_by('row_number')
            else:
                rows = DataRow.objects.filter(
                    dataset=dataset
                ).order_by('row_number')
        except DataSet.DoesNotExist:
            raise ValueError(f"No dataset found for job {job_id}")

        # Prepare data for export
        export_data = []
        for row in rows:
            export_data.append({
                'row_number': row.row_number,
                'original_data': row.original_data,
                'current_data': row.current_data,
                'is_modified': row.is_modified,
                'is_valid': row.is_valid
            })

        # Build metadata
        metadata = MetadataBuilder.build(job, user)
        metadata['export_format'] = file_format
        metadata['include_modified_only'] = include_modified_only
        metadata['row_count'] = len(export_data)

        # Generate file name
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        file_name = f"{job.name.replace(' ', '_')}_{timestamp}.{file_format}"
        file_path = os.path.join(self.export_path, file_name)

        # Save file
        if file_format == 'json':
            self._save_json(file_path, export_data, metadata)
        elif file_format == 'csv':
            self._save_csv(file_path, export_data)
        else:
            raise ValueError(f"Unsupported format: {file_format}")

        # Calculate file hash
        file_hash = self._calculate_file_hash(file_path)
        file_size = os.path.getsize(file_path)

        # Calculate expiration
        expires_at = None
        if expires_in_days:
            expires_at = timezone.now() + timedelta(days=expires_in_days)

        # Create FileExport record
        export = FileExport.objects.create(
            job=job,
            file_format=file_format,
            status='completed',
            file_name=file_name,
            file_path=file_path,
            file_size=file_size,
            file_hash=file_hash,
            metadata=metadata,
            created_by=user,
            expires_at=expires_at
        )

        logger.info(f"Created export {file_name} for job {job_id}")
        return export

    def _save_json(
        self,
        file_path: str,
        data: List[Dict[str, Any]],
        metadata: Dict[str, Any]
    ) -> None:
        """
        Save data as JSON file.

        Args:
            file_path: Path to save file
            data: Data to save
            metadata: Export metadata
        """
        payload = {
            'metadata': metadata,
            'generated_at': datetime.utcnow().isoformat(),
            'export_version': '1.0',
            'data': data
        }

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, indent=2, default=str, ensure_ascii=False)

        logger.debug(f"Saved JSON file: {file_path}")

    def _save_csv(
        self,
        file_path: str,
        data: List[Dict[str, Any]]
    ) -> None:
        """
        Save data as CSV file.

        Args:
            file_path: Path to save file
            data: Data to save
        """
        if not data:
            # Create empty file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write('')
            return

        # Get all unique keys from all rows
        all_keys = set()
        for row in data:
            if 'current_data' in row:
                all_keys.update(row['current_data'].keys())

        # Define column order
        fixed_columns = ['row_number', 'is_modified', 'is_valid']
        data_columns = sorted(all_keys)
        fieldnames = fixed_columns + data_columns

        with open(file_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for row in data:
                csv_row = {
                    'row_number': row.get('row_number', ''),
                    'is_modified': row.get('is_modified', False),
                    'is_valid': row.get('is_valid', True)
                }
                # Add data columns
                current_data = row.get('current_data', {})
                for key in data_columns:
                    csv_row[key] = current_data.get(key, '')

                writer.writerow(csv_row)

        logger.debug(f"Saved CSV file: {file_path}")

    def _calculate_file_hash(self, file_path: str) -> str:
        """
        Calculate SHA256 hash of file for integrity verification.

        Args:
            file_path: Path to file

        Returns:
            SHA256 hash string
        """
        sha256_hash = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()

    def verify_file_integrity(self, export: FileExport) -> bool:
        """
        Verify file integrity using stored hash.

        Args:
            export: FileExport instance

        Returns:
            True if integrity verified, False otherwise
        """
        if not os.path.exists(export.file_path):
            return False

        current_hash = self._calculate_file_hash(export.file_path)
        return current_hash == export.file_hash

    def delete_export(self, export: FileExport) -> bool:
        """
        Delete an export file and its record.

        Args:
            export: FileExport instance

        Returns:
            True if deleted successfully
        """
        try:
            # Delete physical file
            if os.path.exists(export.file_path):
                os.remove(export.file_path)

            # Delete record
            export.delete()
            logger.info(f"Deleted export: {export.file_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete export: {e}")
            return False

    def get_storage_usage(self) -> Dict[str, Any]:
        """
        Get total storage usage statistics.

        Returns:
            Dictionary with storage statistics
        """
        total_size = 0
        file_count = 0

        for export in FileExport.objects.all():
            if os.path.exists(export.file_path):
                total_size += export.file_size
                file_count += 1

        return {
            'total_files': file_count,
            'total_size_bytes': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'export_path': self.export_path
        }