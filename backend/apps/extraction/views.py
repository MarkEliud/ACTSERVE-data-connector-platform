from rest_framework import viewsets, generics, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404
from .models import ExtractionJob, ExtractionBatch, ExtractionResult
from .serializers import (
    ExtractionJobSerializer, ExtractionBatchSerializer,
    ExtractionResultSerializer, StartExtractionSerializer,
    ExtractionProgressSerializer
)
from .services.extractor import ExtractorService
from core.permissions import IsAuthenticated
from core.pagination import CustomPagination


class ExtractionJobViewSet(viewsets.ModelViewSet):
    """ViewSet for managing extraction jobs"""
    
    queryset = ExtractionJob.objects.all()
    serializer_class = ExtractionJobSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'connection', 'connection__database_type']
    search_fields = ['name', 'description', 'table_name']
    ordering_fields = ['created_at', 'updated_at', 'total_rows']
    ordering = ['-created_at']
    pagination_class = CustomPagination
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticated]
        else:
            self.permission_classes = [IsAuthenticated]
        return super().get_permissions()
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        queryset = super().get_queryset()
        if not self.request.user.is_admin:
            # Regular users can only see their own jobs
            queryset = queryset.filter(created_by=self.request.user)
        return queryset
    
    def perform_create(self, serializer):
        """Set created_by when creating job"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Start extraction job"""
        job = self.get_object()
        
        if job.status != 'pending':
            return Response({
                'error': f"Cannot start job with status: {job.status}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            job.start_extraction()
            return Response({
                'status': 'started',
                'job_id': job.id,
                'message': 'Extraction started successfully'
            })
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel extraction job"""
        job = self.get_object()
        
        if job.status not in ['pending', 'running']:
            return Response({
                'error': f"Cannot cancel job with status: {job.status}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        job.cancel()
        return Response({
            'status': 'cancelled',
            'job_id': job.id
        })
    
    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """Get extraction progress"""
        job = self.get_object()
        
        return Response({
            'job_id': job.id,
            'status': job.status,
            'progress_percentage': job.progress_percentage,
            'total_rows': job.total_rows,
            'total_batches': job.total_batches,
            'failed_batches': job.failed_batches,
            'completed_batches': job.batches.filter(status='completed').count()
        })
    
    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """Preview extracted data (first batch)"""
        job = self.get_object()
        
        first_batch = job.batches.filter(status='completed').order_by('batch_number').first()
        
        if not first_batch:
            return Response({
                'error': 'No completed batches available'
            }, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            'batch_id': first_batch.id,
            'row_count': first_batch.row_count,
            'data': first_batch.data[:100]  # Preview first 100 rows
        })


class ExtractionBatchViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing extraction batches"""
    
    queryset = ExtractionBatch.objects.all()
    serializer_class = ExtractionBatchSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['job', 'status']
    search_fields = ['error_message']
    pagination_class = CustomPagination
    
    def get_queryset(self):
        """Filter based on user access"""
        queryset = super().get_queryset()
        if not self.request.user.is_admin:
            # Users can only see batches for their own jobs
            queryset = queryset.filter(job__created_by=self.request.user)
        return queryset


class ExtractionResultViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing extraction results"""
    
    queryset = ExtractionResult.objects.all()
    serializer_class = ExtractionResultSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['job', 'batch', 'is_modified']
    pagination_class = CustomPagination
    
    def get_queryset(self):
        """Filter based on user access"""
        queryset = super().get_queryset()
        if not self.request.user.is_admin:
            # Users can only see results for their own jobs
            queryset = queryset.filter(job__created_by=self.request.user)
        return queryset


class StartExtractionView(generics.GenericAPIView):
    """Start extraction for a job"""
    
    serializer_class = StartExtractionSerializer
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        job_id = serializer.validated_data['job_id']
        job = get_object_or_404(ExtractionJob, id=job_id)
        
        # Check permissions
        if not request.user.is_admin and job.created_by != request.user:
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if job.status != 'pending':
            return Response({
                'error': f"Cannot start job with status: {job.status}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            job.start_extraction()
            return Response({
                'status': 'started',
                'job_id': job.id
            })
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExtractionProgressView(generics.GenericAPIView):
    """Get extraction progress"""
    
    serializer_class = ExtractionProgressSerializer
    permission_classes = [IsAuthenticated]
    
    def get(self, request, job_id):
        job = get_object_or_404(ExtractionJob, id=job_id)
        
        # Check permissions
        if not request.user.is_admin and job.created_by != request.user:
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        return Response({
            'job_id': job.id,
            'status': job.status,
            'progress_percentage': job.progress_percentage,
            'total_rows': job.total_rows,
            'total_batches': job.total_batches,
            'failed_batches': job.failed_batches,
            'completed_batches': job.batches.filter(status='completed').count()
        })


class CancelExtractionView(generics.GenericAPIView):
    """Cancel extraction job"""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, job_id):
        job = get_object_or_404(ExtractionJob, id=job_id)
        
        # Check permissions
        if not request.user.is_admin and job.created_by != request.user:
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if job.status not in ['pending', 'running']:
            return Response({
                'error': f"Cannot cancel job with status: {job.status}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        job.cancel()
        return Response({
            'status': 'cancelled',
            'job_id': job.id
        })