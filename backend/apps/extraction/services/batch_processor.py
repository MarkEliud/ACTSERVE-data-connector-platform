import logging
from typing import Dict, Any
from django.utils import timezone
from apps.extraction.models import ExtractionBatch, ExtractionResult

logger = logging.getLogger(__name__)


class BatchProcessor:
    """Process individual batches of extracted data"""
    
    def __init__(self, batch: ExtractionBatch):
        self.batch = batch
        self.job = batch.job
    
    def process(self) -> None:
        """Process the batch data"""
        try:
            logger.info(f"Processing batch {self.batch.batch_number} for job {self.job.id}")
            
            # Process each row
            for idx, row in enumerate(self.batch.data):
                self._process_row(idx, row)
            
            logger.info(f"Batch {self.batch.batch_number} processed successfully")
            
        except Exception as e:
            logger.error(f"Batch processing failed: {e}")
            raise
    
    def _process_row(self, row_number: int, data: Dict[str, Any]) -> None:
        """Process individual row"""
        # Create extraction result
        ExtractionResult.objects.create(
            job=self.job,
            batch=self.batch,
            row_number=row_number,
            data=data,
            is_modified=False
        )
        
        # Store in data grid for editing
        self._store_in_data_grid(row_number, data)
    
    def _store_in_data_grid(self, row_number: int, data: Dict[str, Any]) -> None:
        """Store row in data grid for editing"""
        from apps.data_grid.models import DataSet, DataRow
        
        # Get or create dataset for this job
        dataset, created = DataSet.objects.get_or_create(
            extraction_job=self.job,
            defaults={
                'name': f"Dataset for {self.job.name}",
                'created_by': self.job.created_by
            }
        )
        
        # Create data row
        DataRow.objects.create(
            dataset=dataset,
            row_number=row_number,
            batch_number=self.batch.batch_number,
            original_data=data,
            current_data=data.copy(),
            is_modified=False
        )