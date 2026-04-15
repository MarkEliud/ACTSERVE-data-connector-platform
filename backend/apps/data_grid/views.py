from rest_framework import viewsets, generics, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404
from django.db import transaction
import json
import csv
from django.http import HttpResponse

from .models import DataSet, DataRow
from .serializers import (
    DataSetSerializer, DataRowSerializer,
    BulkUpdateSerializer, RowValidationSerializer
)
from .validation import validate_row_data
from core.permissions import IsAuthenticated, IsOwnerOrAdmin
from core.pagination import CustomPagination


class DataSetViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing data sets.
    Read-only as datasets are created automatically during extraction.
    """
    queryset = DataSet.objects.all()
    serializer_class = DataSetSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['extraction_job', 'created_by']
    search_fields = ['name', 'extraction_job__name']
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-created_at']
    pagination_class = CustomPagination

    def get_queryset(self):
        """Filter queryset based on user role"""
        queryset = super().get_queryset()
        if not self.request.user.is_admin:
            queryset = queryset.filter(created_by=self.request.user)
        return queryset

    @action(detail=True, methods=['get'])
    def rows(self, request, pk=None):
        """Get all rows for a dataset with pagination"""
        dataset = self.get_object()
        rows = dataset.rows.all()
        
        # Apply pagination
        paginator = CustomPagination()
        page = paginator.paginate_queryset(rows, request, view=self)
        
        if page is not None:
            serializer = DataRowSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = DataRowSerializer(rows, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def modified_rows(self, request, pk=None):
        """Get only modified rows for a dataset"""
        dataset = self.get_object()
        rows = dataset.rows.filter(is_modified=True)
        
        paginator = CustomPagination()
        page = paginator.paginate_queryset(rows, request, view=self)
        
        if page is not None:
            serializer = DataRowSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = DataRowSerializer(rows, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def invalid_rows(self, request, pk=None):
        """Get only invalid rows for a dataset"""
        dataset = self.get_object()
        rows = dataset.rows.filter(is_valid=False)
        
        paginator = CustomPagination()
        page = paginator.paginate_queryset(rows, request, view=self)
        
        if page is not None:
            serializer = DataRowSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = DataRowSerializer(rows, many=True)
        return Response(serializer.data)


class DataRowViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing data rows.
    Supports CRUD operations with validation.
    """
    queryset = DataRow.objects.all()
    serializer_class = DataRowSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['dataset', 'is_modified', 'is_valid', 'batch_number']
    search_fields = ['row_number']
    ordering_fields = ['row_number', 'updated_at']
    ordering = ['row_number']
    pagination_class = CustomPagination

    def get_queryset(self):
        """Filter queryset based on user role"""
        queryset = super().get_queryset()
        if not self.request.user.is_admin:
            queryset = queryset.filter(dataset__created_by=self.request.user)
        return queryset

    def create(self, request, *args, **kwargs):
        """Prevent manual row creation"""
        return Response({
            'error': 'Rows cannot be created manually. They are created during extraction.'
        }, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def update(self, request, *args, **kwargs):
        """Update a row with validation"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Get new data
        new_data = request.data.get('current_data', instance.current_data)
        
        # Validate data
        is_valid, errors = validate_row_data(new_data, instance.original_data)
        
        if not is_valid:
            instance.is_valid = False
            instance.validation_errors = errors
            instance.current_data = new_data
            instance.is_modified = True
            instance.save()
            
            return Response({
                'success': False,
                'message': 'Validation failed',
                'errors': errors,
                'row': DataRowSerializer(instance).data
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update row
        instance.current_data = new_data
        instance.is_modified = True
        instance.is_valid = True
        instance.validation_errors = {}
        instance.save()
        
        return Response({
            'success': True,
            'message': 'Row updated successfully',
            'row': DataRowSerializer(instance).data
        })

    def destroy(self, request, *args, **kwargs):
        """Prevent row deletion"""
        return Response({
            'error': 'Rows cannot be deleted. Use revert to restore original data.'
        }, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=True, methods=['post'])
    def revert(self, request, pk=None):
        """Revert row to original data"""
        instance = self.get_object()
        instance.revert_changes()
        
        return Response({
            'success': True,
            'message': 'Row reverted to original data',
            'row': DataRowSerializer(instance).data
        })

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get change history for a row (if implemented)"""
        instance = self.get_object()
        return Response({
            'row_id': instance.id,
            'changes': instance.get_changes(),
            'is_modified': instance.is_modified
        })


class BulkUpdateView(generics.GenericAPIView):
    """
    Bulk update multiple rows in a dataset.
    POST /api/grid/datasets/{dataset_id}/bulk-update/
    """
    serializer_class = BulkUpdateSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def post(self, request, dataset_id):
        """Process bulk row updates"""
        dataset = get_object_or_404(DataSet, id=dataset_id)
        
        # Check permissions
        if not request.user.is_admin and dataset.created_by != request.user:
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        rows_data = serializer.validated_data['rows']
        results = {
            'success': 0,
            'failed': 0,
            'errors': []
        }
        
        with transaction.atomic():
            for row_item in rows_data:
                try:
                    row = DataRow.objects.get(id=row_item['id'])
                    
                    # Double check dataset ownership
                    if row.dataset != dataset:
                        results['errors'].append({
                            'id': row_item['id'],
                            'error': 'Row does not belong to this dataset'
                        })
                        results['failed'] += 1
                        continue
                    
                    new_data = row_item['current_data']
                    is_valid, errors = validate_row_data(new_data, row.original_data)
                    
                    if is_valid:
                        row.current_data = new_data
                        row.is_modified = True
                        row.is_valid = True
                        row.validation_errors = {}
                        row.save()
                        results['success'] += 1
                    else:
                        row.is_valid = False
                        row.validation_errors = errors
                        row.current_data = new_data
                        row.is_modified = True
                        row.save()
                        
                        results['errors'].append({
                            'id': row_item['id'],
                            'row_number': row.row_number,
                            'errors': errors
                        })
                        results['failed'] += 1
                        
                except DataRow.DoesNotExist:
                    results['errors'].append({
                        'id': row_item['id'],
                        'error': 'Row not found'
                    })
                    results['failed'] += 1
                except Exception as e:
                    results['errors'].append({
                        'id': row_item.get('id'),
                        'error': str(e)
                    })
                    results['failed'] += 1
        
        return Response({
            'success': True,
            'dataset_id': dataset_id,
            'summary': {
                'total': len(rows_data),
                'successful': results['success'],
                'failed': results['failed']
            },
            'errors': results['errors']
        })


class ExportDatasetView(generics.GenericAPIView):
    """
    Export dataset to CSV or JSON.
    GET /api/grid/datasets/{dataset_id}/export/?format=csv
    """
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get(self, request, dataset_id):
        """Export dataset to file"""
        dataset = get_object_or_404(DataSet, id=dataset_id)
        
        # Check permissions
        if not request.user.is_admin and dataset.created_by != request.user:
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        export_format = request.query_params.get('format', 'csv')
        include_modified_only = request.query_params.get('modified_only', 'false').lower() == 'true'
        
        # Get rows
        if include_modified_only:
            rows = dataset.rows.filter(is_modified=True)
        else:
            rows = dataset.rows.all()
        
        if export_format == 'json':
            return self._export_json(dataset, rows)
        elif export_format == 'csv':
            return self._export_csv(dataset, rows)
        else:
            return Response({
                'error': 'Unsupported format. Use csv or json.'
            }, status=status.HTTP_400_BAD_REQUEST)

    def _export_json(self, dataset, rows):
        """Export to JSON format"""
        data = []
        for row in rows:
            data.append({
                'row_number': row.row_number,
                'original_data': row.original_data,
                'current_data': row.current_data,
                'is_modified': row.is_modified,
                'is_valid': row.is_valid
            })
        
        response = HttpResponse(
            json.dumps(data, indent=2),
            content_type='application/json'
        )
        response['Content-Disposition'] = f'attachment; filename="{dataset.name}_export.json"'
        return response

    def _export_csv(self, dataset, rows):
        """Export to CSV format"""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{dataset.name}_export.csv"'
        
        writer = csv.writer(response)
        
        # Get headers from first row
        if rows.exists():
            first_row = rows.first()
            headers = list(first_row.current_data.keys())
            writer.writerow(['row_number', 'is_modified', 'is_valid'] + headers)
            
            for row in rows:
                row_data = [row.row_number, row.is_modified, row.is_valid]
                for header in headers:
                    row_data.append(row.current_data.get(header, ''))
                writer.writerow(row_data)
        
        return response


class RevertRowView(generics.GenericAPIView):
    """
    Revert a single row to original data.
    POST /api/grid/rows/{row_id}/revert/
    """
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def post(self, request, row_id):
        """Revert row to original"""
        row = get_object_or_404(DataRow, id=row_id)
        
        # Check permissions
        if not request.user.is_admin and row.dataset.created_by != request.user:
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        row.revert_changes()
        
        return Response({
            'success': True,
            'message': 'Row reverted successfully',
            'row': DataRowSerializer(row).data
        })


class DatasetStatisticsView(generics.GenericAPIView):
    """
    Get statistics for a dataset.
    GET /api/grid/datasets/{dataset_id}/statistics/
    """
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get(self, request, dataset_id):
        """Get dataset statistics"""
        dataset = get_object_or_404(DataSet, id=dataset_id)
        
        # Check permissions
        if not request.user.is_admin and dataset.created_by != request.user:
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        return Response({
            'dataset_id': dataset.id,
            'dataset_name': dataset.name,
            'statistics': dataset.get_statistics()
        })