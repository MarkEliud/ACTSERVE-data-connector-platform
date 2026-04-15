from typing import Dict, Type, Optional
from .base import BaseConnector


class ConnectorRegistry:
    """
    Registry for database connectors.
    Allows easy extension by registering new connector types.
    """
    
    _connectors: Dict[str, Type[BaseConnector]] = {}
    
    @classmethod
    def register(cls, db_type: str, connector_class: Type[BaseConnector]) -> None:
        """
        Register a connector for a database type.
        
        Args:
            db_type: Database type identifier (e.g., 'postgresql', 'mysql')
            connector_class: Connector class that extends BaseConnector
        """
        if not issubclass(connector_class, BaseConnector):
            raise TypeError(f"{connector_class} must be a subclass of BaseConnector")
        
        cls._connectors[db_type] = connector_class
    
    @classmethod
    def get(cls, db_type: str) -> Optional[Type[BaseConnector]]:
        """
        Get connector class for a database type.
        
        Args:
            db_type: Database type identifier
        
        Returns:
            Connector class or None if not found
        """
        return cls._connectors.get(db_type)
    
    @classmethod
    def has(cls, db_type: str) -> bool:
        """Check if a connector exists for the database type"""
        return db_type in cls._connectors
    
    @classmethod
    def list_types(cls) -> list:
        """List all registered database types"""
        return list(cls._connectors.keys())
    
    @classmethod
    def unregister(cls, db_type: str) -> None:
        """Unregister a connector"""
        if db_type in cls._connectors:
            del cls._connectors[db_type]
    
    @classmethod
    def clear(cls) -> None:
        """Clear all registered connectors"""
        cls._connectors.clear()


# Auto-register connectors when module is loaded
def _register_connectors():
    """Register all available connectors"""
    try:
        from .postgresql import PostgreSQLConnector
        ConnectorRegistry.register('postgresql', PostgreSQLConnector)
    except ImportError as e:
        pass
    
    try:
        from .mysql import MySQLConnector
        ConnectorRegistry.register('mysql', MySQLConnector)
    except ImportError as e:
        pass
    
    try:
        from .mongodb import MongoDBConnector
        ConnectorRegistry.register('mongodb', MongoDBConnector)
    except ImportError as e:
        pass
    
    try:
        from .clickhouse import ClickHouseConnector
        ConnectorRegistry.register('clickhouse', ClickHouseConnector)
    except ImportError as e:
        pass


# Register connectors
_register_connectors()