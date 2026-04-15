import psycopg2
import time
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, List, Optional
import logging
from .base import BaseConnector

logger = logging.getLogger(__name__)


class PostgreSQLConnector(BaseConnector):
    """PostgreSQL database connector with SSL support"""

    def __init__(self, connection_params: Dict[str, Any]):
        super().__init__(connection_params)
        self.connection_pool = None
        self._pool_created = False
        # Default to 'require' so Aiven and other cloud DBs work out of the box
        self.sslmode = connection_params.get('sslmode', 'require')

    def _get_connection_kwargs(self, sslmode_override=None):
        """Build connection kwargs, with optional sslmode override for fallback"""
        kwargs = {
            'host': self.host,
            'port': self.port,
            'dbname': self.database,
            'user': self.user,
            'password': self.password,
            'connect_timeout': self.timeout,
            'sslmode': sslmode_override or self.sslmode,
        }
        return kwargs

    def connect(self):
        """Create connection pool for PostgreSQL with SSL support"""
        try:
            if not self._pool_created:
                kwargs = self._get_connection_kwargs()
                self.connection_pool = pool.SimpleConnectionPool(
                    1, self.max_connections, **kwargs
                )
                self._pool_created = True

            self.connection = self.connection_pool.getconn()
            return self.connection
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            raise

    def disconnect(self):
        """Return connection to pool"""
        if self.connection and self.connection_pool:
            self.connection_pool.putconn(self.connection)
            self.connection = None

    def test_connection(self) -> Dict[str, Any]:
        """
        Test PostgreSQL connection.
        Tries sslmode=require first, falls back to sslmode=disable
        for local/non-SSL databases.
        """
        ssl_attempts = [self.sslmode]
        # If not already set to disable, also try disable as fallback
        if self.sslmode != 'disable':
            ssl_attempts.append('disable')

        last_error = None
        for sslmode in ssl_attempts:
            try:
                start = time.time()
                kwargs = self._get_connection_kwargs(sslmode_override=sslmode)
                conn = psycopg2.connect(**kwargs)
                elapsed_ms = int((time.time() - start) * 1000)

                with conn.cursor() as cursor:
                    cursor.execute("SELECT version();")
                    version = cursor.fetchone()
                    cursor.execute("SELECT current_database();")
                    current_db = cursor.fetchone()

                conn.close()

                logger.info(f"PostgreSQL connected successfully with sslmode={sslmode}")
                return {
                    'success': True,
                    'response_time': elapsed_ms,
                    'details': {
                        'version': version[0] if version else 'Unknown',
                        'database': current_db[0] if current_db else self.database,
                        'sslmode': sslmode,
                        'host': self.host,
                        'port': self.port,
                    },
                }
            except Exception as e:
                last_error = e
                logger.warning(f"PostgreSQL connection attempt with sslmode={sslmode} failed: {e}")
                continue

        logger.error(f"All PostgreSQL connection attempts failed. Last error: {last_error}")
        return {
            'success': False,
            'response_time': 0,
            'error': str(last_error),
        }

    def execute_query(self, query: str, params: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """Execute query and return results as list of dictionaries"""
        try:
            self.connect()
            with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params) if params else cursor.execute(query)
                results = cursor.fetchall()
                return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise
        finally:
            self.disconnect()

    def get_schemas(self) -> List[str]:
        query = """
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog')
            ORDER BY schema_name;
        """
        results = self.execute_query(query)
        return [row['schema_name'] for row in results]

    def get_tables(self, schema: str) -> List[Dict[str, Any]]:
        query = """
            SELECT
                table_name,
                table_type,
                obj_description((table_schema || '.' || table_name)::regclass) as description
            FROM information_schema.tables
            WHERE table_schema = %s
            ORDER BY table_name;
        """
        return self.execute_query(query, (schema,))

    def get_table_schema(self, table: str, schema: str) -> Dict[str, Any]:
        columns = self.execute_query("""
            SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = %s AND table_name = %s
            ORDER BY ordinal_position;
        """, (schema, table))

        primary_keys = self.execute_query("""
            SELECT kc.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kc
                ON kc.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_schema = %s AND tc.table_name = %s;
        """, (schema, table))

        return {
            'table': table,
            'schema': schema,
            'columns': columns,
            'primary_keys': [pk['column_name'] for pk in primary_keys],
        }