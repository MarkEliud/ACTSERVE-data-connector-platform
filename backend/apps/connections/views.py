from rest_framework import viewsets, generics, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q
from .models import ConnectionConfig, ConnectionTestResult, ConnectionHistory
from .serializers import (
    ConnectionConfigSerializer, ConnectionTestSerializer,
    ConnectionTestResultSerializer, ConnectionHistorySerializer
)
from .connectors.registry import ConnectorRegistry
from core.permissions import IsAuthenticated, IsOwnerOrAdmin
from core.pagination import CustomPagination


class ConnectionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing database connections"""

    queryset = ConnectionConfig.objects.all()
    serializer_class = ConnectionConfigSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['database_type', 'is_active', 'is_public']
    search_fields = ['name', 'description', 'host']
    ordering_fields = ['name', 'created_at', 'database_type']
    ordering = ['-created_at']
    pagination_class = CustomPagination

    def get_permissions(self):
        """Set permissions based on action"""
        if self.action == 'create':
            self.permission_classes = [IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            self.permission_classes = [IsOwnerOrAdmin]
        else:  # list, retrieve, etc.
            self.permission_classes = [IsAuthenticated]
        return super().get_permissions()

    def get_queryset(self):
        """
        Filter connections based on user role:
        - Admin: See ALL connections
        - Regular user: See their own connections + public connections created by others
        """
        user = self.request.user
        
        if user.is_admin:
            # Admin sees everything
            return ConnectionConfig.objects.all()
        else:
            # Regular users see:
            # 1. Their own connections (always, regardless of public/private)
            # 2. Public connections created by others (is_public=True)
            return ConnectionConfig.objects.filter(
                Q(created_by=user) |  # Their own connections
                Q(is_public=True)      # Public connections from others
            ).distinct()

    def perform_create(self, serializer):
        """Set created_by when creating connection"""
        serializer.save(created_by=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        """
        Override retrieve to hide password from non-owners
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        
        # Remove password field for non-owners (admins and owners can see it)
        if not request.user.is_admin and instance.created_by != request.user:
            data.pop('password', None)
        
        return Response(data)

    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test a specific saved connection"""
        connection = self.get_object()
        
        # Check permissions - only owner or admin can test
        if not request.user.is_admin and connection.created_by != request.user:
            return Response(
                {'error': 'Permission denied. Only the connection owner can test it.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        result = connection.test_connection()

        ConnectionHistory.objects.create(
            connection=connection,
            action='test',
            status='success' if result['success'] else 'failed',
            details={'test_result': result},
            error_message=result.get('error', ''),
            performed_by=request.user
        )

        if result['success']:
            return Response({
                'status': 'success',
                'message': 'Connection test successful',
                'response_time_ms': result.get('response_time', 0)
            })
        else:
            return Response({
                'status': 'failed',
                'message': 'Connection test failed',
                'error': result.get('error')
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'])
    def toggle_public(self, request, pk=None):
        """Toggle connection public/private status"""
        connection = self.get_object()
        
        # Check permissions - only owner or admin can toggle
        if not request.user.is_admin and connection.created_by != request.user:
            return Response(
                {'error': 'Permission denied. Only the owner can change public/private status.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        connection.is_public = not connection.is_public
        connection.save()
        
        return Response({
            'success': True,
            'is_public': connection.is_public,
            'message': f'Connection is now {"Public" if connection.is_public else "Private"}'
        })

    @action(detail=True, methods=['get'])
    def schemas(self, request, pk=None):
        """
        Get available schemas/databases for the connection.
        GET /api/connections/{id}/schemas/
        """
        connection = self.get_object()
        
        # Check permissions
        if not request.user.is_admin and connection.created_by != request.user:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            connector_class = ConnectorRegistry.get(connection.database_type)
            if not connector_class:
                return Response(
                    {'error': f'Unsupported database type: {connection.database_type}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            connector = connector_class(connection.get_connection_params())
            schemas = connector.get_schemas()
            
            # Format schemas as list of objects with name property
            formatted_schemas = [{'name': schema} for schema in schemas]
            
            return Response({
                'schemas': formatted_schemas,
                'count': len(formatted_schemas)
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def tables(self, request, pk=None):
        """
        Get tables for a specific schema.
        GET /api/connections/{id}/tables/?schema=public
        """
        connection = self.get_object()
        schema = request.query_params.get('schema')
        
        # Check permissions
        if not request.user.is_admin and connection.created_by != request.user:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not schema:
            return Response(
                {'error': 'schema parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            connector_class = ConnectorRegistry.get(connection.database_type)
            if not connector_class:
                return Response(
                    {'error': f'Unsupported database type: {connection.database_type}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            connector = connector_class(connection.get_connection_params())
            tables = connector.get_tables(schema)
            
            # Ensure tables are properly formatted
            formatted_tables = []
            for table in tables:
                if isinstance(table, dict):
                    formatted_tables.append({
                        'table_name': table.get('table_name', ''),
                        'table_type': table.get('table_type', 'TABLE'),
                        'description': table.get('description', '')
                    })
                else:
                    # Handle case where table is just a string
                    formatted_tables.append({
                        'table_name': str(table),
                        'table_type': 'TABLE',
                        'description': ''
                    })
            
            return Response({
                'tables': formatted_tables,
                'count': len(formatted_tables),
                'schema': schema
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def columns(self, request, pk=None):
        """
        Get columns for a specific table.
        GET /api/connections/{id}/columns/?schema=public&table=users
        """
        connection = self.get_object()
        schema = request.query_params.get('schema')
        table = request.query_params.get('table')
        
        # Check permissions
        if not request.user.is_admin and connection.created_by != request.user:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not schema:
            return Response(
                {'error': 'schema parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not table:
            return Response(
                {'error': 'table parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            connector_class = ConnectorRegistry.get(connection.database_type)
            if not connector_class:
                return Response(
                    {'error': f'Unsupported database type: {connection.database_type}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            connector = connector_class(connection.get_connection_params())
            schema_info = connector.get_table_schema(table, schema)
            
            # Format columns for frontend consumption
            formatted_columns = []
            for column in schema_info.get('columns', []):
                formatted_columns.append({
                    'name': column.get('column_name', ''),
                    'type': column.get('data_type', 'unknown'),
                    'nullable': column.get('is_nullable', 'YES') == 'YES',
                    'default': column.get('column_default', None),
                    'max_length': column.get('character_maximum_length', None)
                })
            
            return Response({
                'columns': formatted_columns,
                'count': len(formatted_columns),
                'schema': schema,
                'table': table,
                'primary_keys': schema_info.get('primary_keys', [])
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """
        Preview data from a table.
        GET /api/connections/{id}/preview/?schema=public&table=users&limit=10
        """
        connection = self.get_object()
        schema = request.query_params.get('schema')
        table = request.query_params.get('table')
        limit = int(request.query_params.get('limit', 10))
        
        # Check permissions
        if not request.user.is_admin and connection.created_by != request.user:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not schema or not table:
            return Response(
                {'error': 'schema and table parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            connector_class = ConnectorRegistry.get(connection.database_type)
            if not connector_class:
                return Response(
                    {'error': f'Unsupported database type: {connection.database_type}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            connector = connector_class(connection.get_connection_params())
            
            # Build preview query based on database type
            if connection.database_type == 'mongodb':
                # For MongoDB, use limit directly
                data = connector.get_paginated_data(table, 0, limit)
            else:
                # For SQL databases, build SELECT query
                query = f'SELECT * FROM {schema}.{table} LIMIT {limit}'
                data = connector.execute_query(query)
            
            return Response({
                'data': data,
                'count': len(data),
                'schema': schema,
                'table': table
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def connection_info(self, request, pk=None):
        """
        Get detailed connection information.
        GET /api/connections/{id}/connection_info/
        """
        connection = self.get_object()
        
        # Check permissions
        if not request.user.is_admin and connection.created_by != request.user:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return Response({
            'id': connection.id,
            'name': connection.name,
            'database_type': connection.database_type,
            'database_type_display': connection.get_database_type_display(),
            'host': connection.host,
            'port': connection.port,
            'database_name': connection.database_name,
            'is_active': connection.is_active,
            'is_public': connection.is_public,
            'created_at': connection.created_at,
            'updated_at': connection.updated_at,
            'created_by': connection.created_by.email if connection.created_by else None
        })


class ConnectionTestResultViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing connection test results"""

    queryset = ConnectionTestResult.objects.all()
    serializer_class = ConnectionTestResultSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['connection', 'is_successful']
    search_fields = ['error_message']
    pagination_class = CustomPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user.is_admin:
            # Users can only see test results for connections they own
            queryset = queryset.filter(connection__created_by=user)
        return queryset


class ConnectionHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing connection history"""

    queryset = ConnectionHistory.objects.all()
    serializer_class = ConnectionHistorySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['connection', 'action', 'status']
    search_fields = ['error_message', 'details']
    ordering_fields = ['performed_at', 'duration_ms']
    ordering = ['-performed_at']
    pagination_class = CustomPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user.is_admin:
            # Users can only see history for connections they own
            queryset = queryset.filter(connection__created_by=user)
        return queryset


class ConnectionTestView(APIView):
    """
    POST /api/connections/test/
    Test a connection without saving it first.
    Used by the ConnectionForm 'Test Connection' button.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        db_type = data.get('database_type')

        if not db_type:
            return Response(
                {'success': False, 'error': 'database_type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        connector_class = ConnectorRegistry.get(db_type)
        if not connector_class:
            return Response(
                {'success': False, 'error': f'Unsupported database type: {db_type}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        required_fields = ['host', 'port', 'database_name', 'user', 'password']
        missing = [f for f in required_fields if not data.get(f)]
        if missing:
            return Response(
                {'success': False, 'error': f'Missing required fields: {", ".join(missing)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            connector = connector_class({
                'host': data.get('host'),
                'port': int(data.get('port')),
                'database': data.get('database_name'),
                'user': data.get('user'),
                'password': data.get('password'),
                'timeout': int(data.get('connection_timeout', 30)),
                'max_connections': int(data.get('max_connections', 10)),
            })
            result = connector.test_connection()
            return Response(result)
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class SupportedDatabaseTypesView(APIView):
    """
    GET /api/connections/supported-types/
    Get all supported database types.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'types': ConnectorRegistry.list_types(),
            'count': len(ConnectorRegistry.list_types())
        })


# Legacy function for backward compatibility
def get_supported_types(request):
    """Get all supported database types (legacy function)"""
    return Response({
        'types': ConnectorRegistry.list_types()
    })