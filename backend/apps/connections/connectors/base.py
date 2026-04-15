from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import time
import logging

logger = logging.getLogger(__name__)


class BaseConnector(ABC):
    """
    Abstract base class for all database connectors.
    All database-specific connectors must implement this interface.
    """
    
    def __init__(self, connection_params: Dict[str, Any]):
        """
        Initialize the connector with connection parameters.
        
        Args:
            connection_params: Dictionary containing connection configuration
                Required fields: host, port, database, user, password
                Optional fields: timeout, max_connections, etc.
        """
        self.host = connection_params.get('host')
        self.port = connection_params.get('port')
        self.database = connection_params.get('database')
        self.user = connection_params.get('user')
        self.password = connection_params.get('password')
        self.timeout = connection_params.get('timeout', 30)
        self.max_connections = connection_params.get('max_connections', 10)
        self.connection = None
        self._validate_params()
    
    def _validate_params(self):
        """Validate required connection parameters"""
        required = ['host', 'port', 'database', 'user', 'password']
        missing = [param for param in required if not getattr(self, param)]
        if missing:
            raise ValueError(f"Missing required connection parameters: {missing}")
    
    @abstractmethod
    def connect(self) -> Any:
        """
        Establish connection to the database.
        
        Returns:
            Database connection object
        """
        pass
    
    @abstractmethod
    def disconnect(self) -> None:
        """
        Close the database connection.
        """
        pass
    
    @abstractmethod
    def test_connection(self) -> Dict[str, Any]:
        """
        Test if the connection is working.
        
        Returns:
            Dictionary with:
                - success: bool
                - response_time: int (milliseconds)
                - error: str (if failed)
                - details: dict (optional)
        """
        pass
    
    @abstractmethod
    def execute_query(self, query: str, params: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Execute a query and return results.
        
        Args:
            query: SQL/query string
            params: Query parameters
        
        Returns:
            List of dictionaries representing rows
        """
        pass
    
    @abstractmethod
    def get_schemas(self) -> List[str]:
        """
        Get list of available schemas/databases.
        
        Returns:
            List of schema names
        """
        pass
    
    @abstractmethod
    def get_tables(self, schema: str) -> List[Dict[str, Any]]:
        """
        Get list of tables in a schema.
        
        Args:
            schema: Schema/database name
        
        Returns:
            List of table information dictionaries
        """
        pass
    
    @abstractmethod
    def get_table_schema(self, table: str, schema: str) -> Dict[str, Any]:
        """
        Get schema information for a table.
        
        Args:
            table: Table name
            schema: Schema/database name
        
        Returns:
            Dictionary with column information
        """
        pass

    def get_collection_count(self, collection_name: str) -> int:
        """
        Get count of documents in a collection (for NoSQL databases).
        Default implementation tries to use execute_query.
        """
        try:
            results = self.execute_query(collection_name)
            return len(results) if results else 0
        except Exception as e:
            logger.error(f"Failed to get collection count: {e}")
            return 0

    def get_paginated_data(self, collection_name: str, skip: int, limit: int) -> List[Dict[str, Any]]:
        """
        Get paginated data from collection (for NoSQL databases).
        Default implementation uses execute_query and slices.
        """
        try:
            all_data = self.execute_query(collection_name)
            if all_data and skip < len(all_data):
                return all_data[skip:skip + limit]
            return []
        except Exception as e:
            logger.error(f"Failed to get paginated data: {e}")
            raise
    
    def execute_in_batches(self, query: str, batch_size: int = 1000) -> List[List[Dict[str, Any]]]:
        """
        Execute query and return results in batches.
        
        Args:
            query: Query to execute
            batch_size: Number of rows per batch
        
        Returns:
            List of batches, each batch is a list of rows
        """
        all_results = self.execute_query(query)
        
        # Split into batches
        batches = []
        for i in range(0, len(all_results), batch_size):
            batches.append(all_results[i:i + batch_size])
        
        return batches
    
    def __enter__(self):
        """Context manager entry"""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.disconnect()
    
    def _measure_time(self, func, *args, **kwargs):
        """Helper to measure execution time"""
        start = time.time()
        result = func(*args, **kwargs)
        elapsed_ms = int((time.time() - start) * 1000)
        return result, elapsed_ms