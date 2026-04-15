from django.apps import AppConfig


class ConnectionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.connections'
    verbose_name = 'Connections'

    def ready(self):
        """Register all database connectors when the app starts"""
        from .connectors.registry import ConnectorRegistry
        from .connectors.postgresql import PostgreSQLConnector

        ConnectorRegistry.register('postgresql', PostgreSQLConnector)

        # Register other connectors if they exist
        try:
            from .connectors.mysql import MySQLConnector
            ConnectorRegistry.register('mysql', MySQLConnector)
        except ImportError:
            pass

        try:
            from .connectors.mongodb import MongoDBConnector
            ConnectorRegistry.register('mongodb', MongoDBConnector)
        except ImportError:
            pass

        try:
            from .connectors.clickhouse import ClickHouseConnector
            ConnectorRegistry.register('clickhouse', ClickHouseConnector)
        except ImportError:
            pass