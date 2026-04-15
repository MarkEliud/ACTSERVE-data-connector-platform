from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from typing import Dict, Any, List, Optional
import logging
import json
from .base import BaseConnector

logger = logging.getLogger(__name__)


class MongoDBConnector(BaseConnector):
    """MongoDB database connector"""

    def connect(self):
        """Establish MongoDB connection"""
        try:
            # Build connection string
            if self.user and self.password:
                uri = f"mongodb://{self.user}:{self.password}@{self.host}:{self.port}/"
            else:
                uri = f"mongodb://{self.host}:{self.port}/"

            self.connection = MongoClient(
                uri,
                serverSelectionTimeoutMS=self.timeout * 1000,
                maxPoolSize=self.max_connections
            )

            # Test connection
            self.connection.admin.command('ping')

            # Get database
            self.db = self.connection[self.database]

            return self.connection
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise

    def disconnect(self):
        """Close MongoDB connection"""
        if self.connection:
            self.connection.close()
            self.connection = None
            self.db = None

    def test_connection(self) -> Dict[str, Any]:
        """Test MongoDB connection"""
        try:
            conn, elapsed_ms = self._measure_time(self.connect)

            # Get server info
            server_info = conn.server_info()

            self.disconnect()

            return {
                'success': True,
                'response_time': elapsed_ms,
                'details': {
                    'version': server_info.get('version', 'Unknown'),
                    'storage_engine': server_info.get('storageEngine', {}).get('name', 'Unknown')
                }
            }
        except Exception as e:
            logger.error(f"MongoDB connection test failed: {e}")
            return {
                'success': False,
                'response_time': 0,
                'error': str(e)
            }

    def execute_query(self, query: str, params: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """Execute query (collection.find) in MongoDB"""
        try:
            self.connect()

            # Parse query - expecting format: collection_name|filter|projection
            parts = query.split('|')
            collection_name = parts[0]
            
            # SAFE parsing - use json.loads instead of eval
            try:
                filter_query = json.loads(parts[1]) if len(parts) > 1 and parts[1] else {}
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON in filter query, using empty dict")
                filter_query = {}
            
            try:
                projection = json.loads(parts[2]) if len(parts) > 2 and parts[2] else None
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON in projection, using None")
                projection = None

            collection = self.db[collection_name]

            if projection:
                results = collection.find(filter_query, projection)
            else:
                results = collection.find(filter_query)

            # Convert ObjectId to string for JSON serialization
            documents = []
            for doc in results:
                doc['_id'] = str(doc['_id'])
                documents.append(doc)

            return documents
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise
        finally:
            self.disconnect()

    def get_collection_count(self, collection_name: str) -> int:
        """Get count of documents in a collection"""
        try:
            self.connect()
            collection = self.db[collection_name]
            count = collection.count_documents({})
            self.disconnect()
            logger.info(f"Collection '{collection_name}' has {count} documents")
            return count
        except Exception as e:
            logger.error(f"Failed to get collection count: {e}")
            return 0

    def get_paginated_data(self, collection_name: str, skip: int, limit: int) -> List[Dict[str, Any]]:
        """Get paginated data from collection using skip/limit"""
        try:
            self.connect()
            collection = self.db[collection_name]
            cursor = collection.find().skip(skip).limit(limit)

            documents = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])
                documents.append(doc)

            self.disconnect()
            logger.info(f"Retrieved {len(documents)} documents from '{collection_name}' (skip={skip}, limit={limit})")
            return documents
        except Exception as e:
            logger.error(f"Failed to get paginated data: {e}")
            raise

    def get_schemas(self) -> List[str]:
        """Get list of databases (schemas in MongoDB)"""
        try:
            self.connect()
            databases = self.connection.list_database_names()
            # Exclude system databases
            exclude = ['admin', 'config', 'local']
            return [db for db in databases if db not in exclude]
        except Exception as e:
            logger.error(f"Failed to list databases: {e}")
            raise
        finally:
            self.disconnect()

    def get_tables(self, schema: str) -> List[Dict[str, Any]]:
        """Get collections in a database"""
        try:
            self.connect()
            db = self.connection[schema]
            collections = db.list_collection_names()

            # Get estimated document count for each collection
            tables = []
            for collection_name in collections:
                collection = db[collection_name]
                tables.append({
                    'table_name': collection_name,
                    'table_type': 'collection',
                    'description': f'Collection with {collection.estimated_document_count()} documents'
                })

            return tables
        except Exception as e:
            logger.error(f"Failed to list collections: {e}")
            raise
        finally:
            self.disconnect()

    def get_table_schema(self, table: str, schema: str) -> Dict[str, Any]:
        """Get schema for a collection (sample documents)"""
        try:
            self.connect()
            db = self.connection[schema]
            collection = db[table]

            # Get sample documents to infer schema
            sample = collection.find().limit(10)

            # Infer schema from sample documents
            fields = set()
            for doc in sample:
                fields.update(doc.keys())

            columns = []
            for field in fields:
                columns.append({
                    'column_name': field,
                    'data_type': 'mixed',  # MongoDB is schemaless
                    'is_nullable': 'YES',
                    'column_default': None
                })

            return {
                'table': table,
                'schema': schema,
                'columns': columns,
                'primary_keys': ['_id']  # _id is always present
            }
        except Exception as e:
            logger.error(f"Failed to get collection schema: {e}")
            raise
        finally:
            self.disconnect()