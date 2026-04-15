from datetime import datetime
from typing import Dict, Any
from django.conf import settings

class MetadataBuilder:
    """
    Builder for export metadata.
    Ensures consistent metadata structure across all exports.
    """

    @staticmethod
    def build(job, user) -> Dict[str, Any]:
        """
        Build metadata dictionary for an export.

        Args:
            job: ExtractionJob instance
            user: User who created the export

        Returns:
            Metadata dictionary
        """
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'timezone': settings.TIME_ZONE,
            'job_id': job.id,
            'job_name': job.name,
            'job_description': job.description,
            'job_status': job.status,
            'source_database': {
                'type': job.connection.database_type,
                'host': job.connection.host,
                'port': job.connection.port,
                'database': job.connection.database_name,
                'table': job.table_name,
                'schema': job.schema_name
            },
            'extraction_config': {
                'batch_size': job.batch_size,
                'columns': job.columns,
                'filters': job.filters,
                'custom_query': bool(job.query)
            },
            'created_by': {
                'user_id': user.id if user else None,
                'email': user.email if user else None,
                'username': user.username if user else None
            },
            'application': {
                'name': 'Data Connector Platform',
                'version': '1.0.0',
                'company': 'Actuarial Services (E.A) Ltd.'
            }
        }

    @staticmethod
    def add_custom_field(
        metadata: Dict[str, Any],
        key: str,
        value: Any
    ) -> Dict[str, Any]:
        """
        Add a custom field to metadata.

        Args:
            metadata: Existing metadata dictionary
            key: Field key
            value: Field value

        Returns:
            Updated metadata dictionary
        """
        if 'custom_fields' not in metadata:
            metadata['custom_fields'] = {}
        metadata['custom_fields'][key] = value
        return metadata

    @staticmethod
    def add_processing_info(
        metadata: Dict[str, Any],
        processing_time_ms: int,
        records_processed: int
    ) -> Dict[str, Any]:
        """
        Add processing information to metadata.

        Args:
            metadata: Existing metadata dictionary
            processing_time_ms: Processing time in milliseconds
            records_processed: Number of records processed

        Returns:
            Updated metadata dictionary
        """
        metadata['processing'] = {
            'time_ms': processing_time_ms,
            'records_processed': records_processed,
            'timestamp': datetime.utcnow().isoformat()
        }
        return