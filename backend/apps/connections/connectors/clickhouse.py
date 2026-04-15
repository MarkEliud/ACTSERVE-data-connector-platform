import logging
import time
from typing import Dict, Any, List, Optional
from .base import BaseConnector

logger = logging.getLogger(__name__)


class ClickHouseConnector(BaseConnector):
    """
    ClickHouse database connector using clickhouse-connect.
    
    Port mapping:
    - 8443: HTTPS (HTTP interface with TLS)
    - 9440: Native TCP with TLS  
    - 8123: HTTP without TLS (not supported by Aiven)
    - 9000: Native TCP without TLS
    - 15651: Aiven ClickHouse default port
    """

    def __init__(self, connection_params: Dict[str, Any]):
        super().__init__(connection_params)
        self.client = None

        # Get port and auto-correct common wrong ports
        port = int(connection_params.get('port', 8443))
        
        # Auto-correct common wrong ports for Aiven ClickHouse
        if port == 8123:
            logger.warning(f"Port 8123 is not secure for Aiven ClickHouse. Auto-correcting to 8443")
            port = 8443
            connection_params['port'] = port
        elif port == 9000:
            logger.warning(f"Port 9000 is not secure for Aiven ClickHouse. Auto-correcting to 9440")
            port = 9440
            connection_params['port'] = port
        
        # Aiven ClickHouse uses these ports with TLS
        secure_ports = {8443, 9440, 15651}
        default_secure = port in secure_ports

        self.secure = connection_params.get('secure', default_secure)
        self.verify = connection_params.get('verify', False)
        self.port = port

    def connect(self):
        """Establish ClickHouse connection"""
        try:
            import clickhouse_connect

            kwargs = {
                'host': self.host,
                'port': self.port,
                'username': self.user,
                'password': self.password,
                'database': self.database,
                'connect_timeout': self.timeout,
                'send_receive_timeout': self.timeout,
                'secure': self.secure,
                'verify': self.verify,
            }

            logger.info(
                f"Connecting to ClickHouse at {self.host}:{self.port} "
                f"(secure={self.secure}, verify={self.verify})"
            )
            self.client = clickhouse_connect.get_client(**kwargs)
            self.client.query("SELECT 1")
            return self.client

        except ImportError:
            raise RuntimeError("clickhouse-connect not installed. Run: pip install clickhouse-connect")
        except Exception as e:
            logger.error(f"Failed to connect to ClickHouse: {e}")
            raise

    def disconnect(self):
        if self.client:
            try:
                self.client.close()
            except Exception as e:
                logger.warning(f"Error closing ClickHouse connection: {e}")
            finally:
                self.client = None

    def test_connection(self) -> Dict[str, Any]:
        """
        Test ClickHouse connection with multiple port/SSL fallbacks.
        This tries various port/SSL combinations to find a working connection.
        """
        
        # Define connection attempts (port, secure)
        attempts = [
            (self.port, self.secure),  # User's configured port
            (15651, True),   # Aiven default
            (8443, True),    # HTTPS
            (9440, True),    # Native TLS
            (8123, False),   # HTTP no SSL (local only)
            (9000, False),   # Native no SSL (local only)
        ]
        # Remove duplicates while preserving order
        seen = set()
        attempts = [x for x in attempts if not (x in seen or seen.add(x))]

        last_error = None
        for port, secure in attempts:
            try:
                import clickhouse_connect

                start = time.time()
                client = clickhouse_connect.get_client(
                    host=self.host,
                    port=port,
                    username=self.user,
                    password=self.password,
                    database=self.database,
                    connect_timeout=self.timeout,
                    send_receive_timeout=self.timeout,
                    secure=secure,
                    verify=False,  # Skip verification for testing
                )

                version_result = client.query("SELECT version()")
                version = version_result.result_rows[0][0] if version_result.result_rows else 'Unknown'

                db_result = client.query("SHOW DATABASES")
                db_count = len(db_result.result_rows)

                elapsed_ms = int((time.time() - start) * 1000)
                client.close()

                logger.info(f"ClickHouse connected successfully: port={port}, secure={secure}")
                
                # If the working port is different from the configured one, update it
                if port != self.port:
                    logger.info(f"Updating connection port from {self.port} to {port}")
                    self.port = port
                    self.secure = secure

                return {
                    'success': True,
                    'response_time': elapsed_ms,
                    'details': {
                        'version': version,
                        'database_count': db_count,
                        'host': self.host,
                        'port': port,
                        'secure': secure,
                    }
                }
            except Exception as e:
                last_error = e
                logger.warning(f"ClickHouse attempt port={port}, secure={secure} failed: {e}")
                continue

        return {
            'success': False,
            'response_time': 0,
            'error': str(last_error),
        }

    def execute_query(self, query: str, params: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Execute query and return results as list of dictionaries.
        Uses the working port that was established during test_connection.
        """
        try:
            self.connect()
            result = self.client.query(query, parameters=params) if params else self.client.query(query)
            if result.result_rows:
                columns = result.column_names
                return [dict(zip(columns, row)) for row in result.result_rows]
            return []
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise
        finally:
            self.disconnect()

    def get_schemas(self) -> List[str]:
        """Get list of databases/schemas"""
        result = self.execute_query("SHOW DATABASES")
        exclude = {'system', 'information_schema', 'INFORMATION_SCHEMA'}
        schemas = []
        for row in result:
            name = row.get('name') or (list(row.values())[0] if row else None)
            if name and name not in exclude:
                schemas.append(name)
        return schemas

    def get_tables(self, schema: str) -> List[Dict[str, Any]]:
        """Get tables in a database/schema"""
        return self.execute_query("""
            SELECT name as table_name, engine as table_type, comment as description
            FROM system.tables
            WHERE database = %(database)s
            ORDER BY name
        """, {'database': schema})

    def get_table_schema(self, table: str, schema: str) -> Dict[str, Any]:
        """Get table schema information"""
        columns = self.execute_query("""
            SELECT name as column_name, type as data_type,
                   default_type, default_expression as column_default,
                   position as ordinal_position, is_in_primary_key
            FROM system.columns
            WHERE database = %(database)s AND table = %(table)s
            ORDER BY position
        """, {'database': schema, 'table': table})

        primary_keys = [c['column_name'] for c in columns if c.get('is_in_primary_key')]
        return {
            'table': table,
            'schema': schema,
            'columns': columns,
            'primary_keys': primary_keys
        }

    def get_paginated_data(self, table: str, offset: int, limit: int, schema: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get paginated data from a table"""
        full_table = f"{schema}.{table}" if schema else table
        return self.execute_query(f"SELECT * FROM {full_table} LIMIT {limit} OFFSET {offset}")

    def get_row_count(self, table: str, schema: Optional[str] = None) -> int:
        """Get total row count for a table"""
        full_table = f"{schema}.{table}" if schema else table
        result = self.execute_query(f"SELECT COUNT(*) as count FROM {full_table}")
        return result[0]['count'] if result else 0