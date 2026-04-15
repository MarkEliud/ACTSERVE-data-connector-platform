import logging
from typing import Dict, Any, List
from datetime import datetime, date, time, timedelta
from decimal import Decimal
from uuid import UUID
from django.utils import timezone
from apps.connections.connectors.registry import ConnectorRegistry
from apps.extraction.models import ExtractionJob, ExtractionBatch
from .batch_processor import BatchProcessor
from .query_builder import QueryBuilder

logger = logging.getLogger(__name__)


def serialize_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert a database row dict to JSON-serializable types.
    Handles datetime, date, time, Decimal, UUID, bytes, etc.
    """
    result = {}
    for key, value in row.items():
        if isinstance(value, (datetime,)):
            result[key] = value.isoformat()
        elif isinstance(value, date):
            result[key] = value.isoformat()
        elif isinstance(value, time):
            result[key] = value.isoformat()
        elif isinstance(value, timedelta):
            result[key] = str(value)
        elif isinstance(value, Decimal):
            result[key] = float(value)
        elif isinstance(value, UUID):
            result[key] = str(value)
        elif isinstance(value, bytes):
            result[key] = value.decode('utf-8', errors='replace')
        elif isinstance(value, memoryview):
            result[key] = bytes(value).decode('utf-8', errors='replace')
        else:
            result[key] = value
    return result


class ExtractorService:
    """Main extraction service that orchestrates the extraction process"""

    def __init__(self, job: ExtractionJob):
        self.job = job
        self.connection = job.connection
        self.connector = None
        self.query_builder = QueryBuilder(job)

    def process(self) -> None:
        """Process the extraction job"""
        try:
            logger.info(f"Starting extraction job {self.job.id}: {self.job.name}")

            # Initialize connector
            self._initialize_connector()

            # Build query
            query = self._build_query()

            # Get total row count
            total_rows = self._get_total_rows(query)
            self.job.total_rows = total_rows
            self.job.save()

            # Process in batches
            self._process_batches(query)

            # Mark job as completed
            self.job.status = 'completed'
            self.job.completed_at = timezone.now()
            self.job.save()

            logger.info(f"Extraction job {self.job.id} completed successfully")

        except Exception as e:
            logger.error(f"Extraction job {self.job.id} failed: {str(e)}")
            self.job.status = 'failed'
            self.job.save()
            raise

    def _initialize_connector(self):
        """Initialize the database connector"""
        connector_class = ConnectorRegistry.get(self.connection.database_type)
        if not connector_class:
            raise ValueError(f"Unsupported database type: {self.connection.database_type}")

        params = self.connection.get_connection_params()
        self.connector = connector_class(params)

    def _build_query(self) -> str:
        """Build the query for extraction"""
        if self.job.query:
            return self.job.query
        else:
            return self.query_builder.build_select_query()

    def _get_total_rows(self, query: str) -> int:
        """Get total number of rows to extract"""
        try:
            # For NoSQL databases (MongoDB), use different approach
            if self.connection.database_type == 'mongodb':
                # Try to get count using collection count method
                try:
                    return self.connector.get_collection_count(self.job.table_name)
                except Exception as e:
                    logger.warning(f"Could not get MongoDB count via method: {e}")
                    # Fallback: execute query and count results
                    results = self.connector.execute_query(self.job.table_name)
                    return len(results) if results else 0
            
            # For SQL databases
            count_query = self.query_builder.build_count_query(query)
            result = self.connector.execute_query(count_query)

            if result and len(result) > 0:
                return result[0].get('count', 0)
            return 0
        except Exception as e:
            logger.error(f"Failed to get total rows: {e}")
            return 0

    def _process_batches(self, query: str) -> None:
        """Process extraction in batches"""
        offset = 0
        batch_number = 1

        while offset < self.job.total_rows:
            batch = ExtractionBatch.objects.create(
                job=self.job,
                batch_number=batch_number,
                offset=offset,
                status='pending'
            )

            try:
                # For NoSQL databases (MongoDB), use pagination method
                if self.connection.database_type == 'mongodb':
                    # Use MongoDB's skip/limit pagination
                    raw_data = self.connector.get_paginated_data(
                        self.job.table_name,
                        offset,
                        self.job.batch_size
                    )
                else:
                    # For SQL databases, use traditional paginated query
                    paginated_query = self.query_builder.build_paginated_query(
                        query,
                        offset,
                        self.job.batch_size
                    )
                    raw_data = self.connector.execute_query(paginated_query)

                # Serialize all values to JSON-safe types
                data = [serialize_row(row) for row in raw_data]

                # Store data in batch
                batch.data = data
                batch.row_count = len(data)
                batch.status = 'completed'
                batch.completed_at = timezone.now()
                batch.save()

                # Process batch for storage
                batch_processor = BatchProcessor(batch)
                batch_processor.process()

                logger.info(f"Processed batch {batch_number} with {len(data)} rows")

            except Exception as e:
                logger.error(f"Failed to process batch {batch_number}: {e}")
                batch.status = 'failed'
                batch.error_message = str(e)
                batch.save()
                self.job.failed_batches += 1
                self.job.save()

            offset += self.job.batch_size
            batch_number += 1

        self.job.total_batches = batch_number - 1
        self.job.save()