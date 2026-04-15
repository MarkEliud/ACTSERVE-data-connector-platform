import pymysql
from pymysql.cursors import DictCursor
from typing import Dict, Any, List, Optional
import logging
import socket
from .base import BaseConnector

logger = logging.getLogger(__name__)


class MySQLConnector(BaseConnector):
    """MySQL database connector with SSL support and better error diagnostics"""

    def __init__(self, connection_params: Dict[str, Any]):
        super().__init__(connection_params)
        self.ssl_ca = connection_params.get('ssl_ca', None)
        self.ssl_cert = connection_params.get('ssl_cert', None)
        self.ssl_key = connection_params.get('ssl_key', None)

    def _resolve_host(self):
        """Raise a clear error if hostname cannot be resolved"""
        try:
            resolved = socket.gethostbyname(self.host)
            logger.info(f"Resolved {self.host} -> {resolved}")
        except socket.gaierror as e:
            raise ConnectionError(
                f"Cannot resolve hostname '{self.host}'. "
                f"Please check the host is correct and reachable from this server. "
                f"DNS error: {e}"
            )

    def _get_ssl_dict(self):
        ssl_dict = {}
        if self.ssl_ca:
            ssl_dict['ca'] = self.ssl_ca
        if self.ssl_cert:
            ssl_dict['cert'] = self.ssl_cert
        if self.ssl_key:
            ssl_dict['key'] = self.ssl_key
        return ssl_dict if ssl_dict else None

    def connect(self):
        """Establish MySQL connection"""
        try:
            self._resolve_host()

            kwargs = {
                'host': self.host,
                'port': int(self.port),
                'database': self.database,
                'user': self.user,
                'password': self.password,
                'connect_timeout': self.timeout,
                'cursorclass': DictCursor,
                'charset': 'utf8mb4',
            }

            ssl_dict = self._get_ssl_dict()
            if ssl_dict:
                kwargs['ssl'] = ssl_dict

            self.connection = pymysql.connect(**kwargs)
            return self.connection
        except Exception as e:
            logger.error(f"Failed to connect to MySQL: {e}")
            raise

    def disconnect(self):
        if self.connection:
            try:
                self.connection.close()
            except Exception:
                pass
            finally:
                self.connection = None

    def test_connection(self) -> Dict[str, Any]:
        """Test MySQL connection with clear diagnostics"""
        try:
            conn, elapsed_ms = self._measure_time(self.connect)

            with conn.cursor() as cursor:
                cursor.execute("SELECT VERSION() as version;")
                version_row = cursor.fetchone()
                cursor.execute("SELECT DATABASE() as db;")
                db_row = cursor.fetchone()

            self.disconnect()

            return {
                'success': True,
                'response_time': elapsed_ms,
                'details': {
                    'version': version_row.get('version', 'Unknown') if version_row else 'Unknown',
                    'database': db_row.get('db', self.database) if db_row else self.database,
                    'host': self.host,
                    'port': self.port,
                }
            }
        except Exception as e:
            logger.error(f"MySQL connection test failed: {e}")
            return {
                'success': False,
                'response_time': 0,
                'error': str(e),
            }

    def execute_query(self, query: str, params: Optional[Dict] = None) -> List[Dict[str, Any]]:
        try:
            self.connect()
            with self.connection.cursor() as cursor:
                cursor.execute(query, params) if params else cursor.execute(query)
                return list(cursor.fetchall())
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise
        finally:
            self.disconnect()

    def get_schemas(self) -> List[str]:
        results = self.execute_query("SHOW DATABASES;")
        exclude = {'information_schema', 'mysql', 'performance_schema', 'sys'}
        return [row['Database'] for row in results if row['Database'] not in exclude]

    def get_tables(self, schema: str) -> List[Dict[str, Any]]:
        return self.execute_query("""
            SELECT TABLE_NAME as table_name, TABLE_TYPE as table_type, TABLE_COMMENT as description
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = %s
            ORDER BY TABLE_NAME;
        """, (schema,))

    def get_table_schema(self, table: str, schema: str) -> Dict[str, Any]:
        columns = self.execute_query("""
            SELECT COLUMN_NAME as column_name, DATA_TYPE as data_type,
                   IS_NULLABLE as is_nullable, COLUMN_DEFAULT as column_default,
                   CHARACTER_MAXIMUM_LENGTH as character_maximum_length
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
            ORDER BY ORDINAL_POSITION;
        """, (schema, table))

        primary_keys = self.execute_query("""
            SELECT kcu.COLUMN_NAME as column_name
            FROM information_schema.TABLE_CONSTRAINTS tc
            JOIN information_schema.KEY_COLUMN_USAGE kcu
                ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
            WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
                AND tc.TABLE_SCHEMA = %s AND tc.TABLE_NAME = %s;
        """, (schema, table))

        return {
            'table': table,
            'schema': schema,
            'columns': columns,
            'primary_keys': [pk['column_name'] for pk in primary_keys],
        }