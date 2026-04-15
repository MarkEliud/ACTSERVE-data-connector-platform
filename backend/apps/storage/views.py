from rest_framework import viewsets, generics, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404
from django.http import FileResponse, HttpResponse
from django.utils import timezone
from django.db import transaction, models
import os
import json
import csv
import hashlib

from .models import StoredRecord, FileExport
from .serializers import (
    StoredRecordSerializer, FileExportSerializer,
    FileExportCreateSerializer, FileShareSerializer
)
from .services.database_storage import DatabaseStorageService
from .services.file_storage import FileStorageService
from .services.metadata_builder import MetadataBuilder
from core.permissions import IsAuthenticated, IsOwnerOrAdmin
from core.pagination import CustomPagination


class StoredRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing stored records."""
    queryset = StoredRecord.objects.all()
    serializer_class = StoredRecordSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['job', 'validation_status', 'is_modified']
    search_fields = ['row_number', 'job__name']
    ordering_fields = ['row_number', 'created_at', 'updated_at']
    ordering = ['row_number']
    pagination_class = CustomPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        if not self.request.user.is_admin:
            queryset = queryset.filter(job__created_by=self.request.user)
        return queryset

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        queryset = self.get_queryset()
        stats = {
            'total_records': queryset.count(),
            'modified_records': queryset.filter(is_modified=True).count(),
            'valid_records': queryset.filter(validation_status='valid').count(),
            'invalid_records': queryset.filter(validation_status='invalid').count(),
        }
        by_job = {}
        for record in queryset.select_related('job').values(
            'job__id', 'job__name', 'validation_status'
        ):
            job_id = record['job__id']
            if job_id not in by_job:
                by_job[job_id] = {
                    'job_name': record['job__name'],
                    'total': 0,
                    'valid': 0,
                    'invalid': 0
                }
            by_job[job_id]['total'] += 1
            if record['validation_status'] == 'valid':
                by_job[job_id]['valid'] += 1
            else:
                by_job[job_id]['invalid'] += 1

        return Response({
            'summary': stats,
            'by_job': list(by_job.values())
        })


class FileExportViewSet(viewsets.ModelViewSet):
    """ViewSet for managing file exports."""
    queryset = FileExport.objects.all()
    serializer_class = FileExportSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['job', 'file_format', 'status', 'is_public']
    search_fields = ['file_name', 'job__name', 'created_by__email']
    ordering_fields = ['created_at', 'file_size', 'status']
    ordering = ['-created_at']
    pagination_class = CustomPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        if not self.request.user.is_admin:
            try:
                from apps.accounts.models import FileShare
                shared_files = FileShare.objects.filter(
                    shared_with=self.request.user
                ).values_list('file_path', flat=True)

                queryset = queryset.filter(
                    models.Q(created_by=self.request.user) |
                    models.Q(is_public=True) |
                    models.Q(file_path__in=shared_files)
                )
            except Exception:
                queryset = queryset.filter(created_by=self.request.user)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = FileExportCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        job_id = serializer.validated_data['job_id']
        file_format = serializer.validated_data['file_format']
        include_modified_only = serializer.validated_data['include_modified_only']
        expires_in_days = serializer.validated_data.get('expires_in_days')

        storage_service = FileStorageService()
        export = storage_service.create_export(
            job_id=job_id,
            file_format=file_format,
            include_modified_only=include_modified_only,
            user=request.user,
            expires_in_days=expires_in_days
        )

        export_serializer = self.get_serializer(export)
        return Response(
            export_serializer.data,
            status=status.HTTP_201_CREATED
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not request.user.is_admin and instance.created_by != request.user:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        instance.delete_file()
        file_name = instance.file_name
        instance.delete()
        return Response({
            'success': True,
            'message': f'File {file_name} deleted successfully'
        })

    @action(detail=True, methods=['post'])
    def toggle_public(self, request, pk=None):
        export = self.get_object()
        if not request.user.is_admin and export.created_by != request.user:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        export.is_public = not export.is_public
        export.save()
        return Response({'success': True, 'is_public': export.is_public})

class FileExportDownloadView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, export_id):
        export = get_object_or_404(FileExport, id=export_id)
        
        # Debug logging
        print(f"Download requested for file {export_id} by user {request.user.email}")
        print(f"File: {export.file_name}, is_public={export.is_public}, created_by={export.created_by}")
        print(f"User is_admin={request.user.is_admin}")

        # Check access permissions
        if not export.get_access_permissions(request.user):
            return Response(
                {
                    'error': 'Permission denied. You do not have access to this file.',
                    'details': {
                        'is_admin': request.user.is_admin,
                        'is_owner': export.created_by == request.user,
                        'is_public': export.is_public,
                        'file_owner': export.created_by.email if export.created_by else None,
                        'current_user': request.user.email
                    }
                },
                status=status.HTTP_403_FORBIDDEN
            )

        if not os.path.exists(export.file_path):
            return Response(
                {'error': 'File not found on server', 'file_path': export.file_path},
                status=status.HTTP_404_NOT_FOUND
            )

        if export.is_expired:
            return Response(
                {'error': 'File has expired', 'expired_at': export.expires_at},
                status=status.HTTP_410_GONE
            )

        content_type = 'application/json' if export.file_format == 'json' else 'text/csv'
        response = FileResponse(
            open(export.file_path, 'rb'),
            content_type=content_type
        )
        response['Content-Disposition'] = f'attachment; filename="{export.file_name}"'
        response['Content-Length'] = export.file_size
        return response

class FileShareView(generics.GenericAPIView):
    serializer_class = FileShareSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, export_id):
        export = get_object_or_404(FileExport, id=export_id)

        if not request.user.is_admin and export.created_by != request.user:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(
            data={**request.data, 'file_id': export_id},
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        from apps.accounts.models import FileShare
        from django.contrib.auth import get_user_model
        User = get_user_model()

        shared_with = User.objects.get(email=serializer.validated_data['user_email'])
        share, created = FileShare.objects.get_or_create(
            file_path=export.file_path,
            owner=export.created_by,
            shared_with=shared_with
        )

        if not created:
            return Response({
                'success': False,
                'message': 'File already shared with this user'
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'message': f'File shared with {shared_with.email}',
            'share_id': share.id
        })


class FileRevokeView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, export_id):
        export = get_object_or_404(FileExport, id=export_id)

        if not request.user.is_admin and export.created_by != request.user:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        user_email = request.data.get('user_email')
        if not user_email:
            return Response(
                {'error': 'user_email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.accounts.models import FileShare
        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            shared_with = User.objects.get(email=user_email)
            FileShare.objects.filter(
                file_path=export.file_path,
                shared_with=shared_with
            ).delete()
            return Response({
                'success': True,
                'message': f'Access revoked for {user_email}'
            })
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class FileSharesListView(generics.GenericAPIView):
    """Get list of users shared with for a file"""
    permission_classes = [IsAuthenticated]

    def get(self, request, export_id):
        export = get_object_or_404(FileExport, id=export_id)

        # Check permissions - only owner or admin can see shares
        if not request.user.is_admin and export.created_by != request.user:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        from apps.accounts.models import FileShare
        from django.contrib.auth import get_user_model
        User = get_user_model()

        shares = FileShare.objects.filter(file_path=export.file_path).select_related('shared_with')
        
        shares_data = []
        for share in shares:
            shares_data.append({
                'email': share.shared_with.email,
                'shared_at': share.created_at.isoformat(),
                'share_id': share.id
            })

        return Response({
            'shares': shares_data,
            'count': len(shares_data)
        })
        
class FileMetadataView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, export_id):
        export = get_object_or_404(FileExport, id=export_id)

        if not export.get_access_permissions(request.user):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response({
            'file_id': export.id,
            'file_name': export.file_name,
            'file_format': export.file_format,
            'file_size': export.file_size,
            'file_hash': export.file_hash,
            'metadata': export.metadata,
            'created_at': export.created_at,
            'created_by': export.created_by.email if export.created_by else None,
            'is_public': export.is_public,
            'expires_at': export.expires_at,
            'is_expired': export.is_expired
        })


class CleanupExpiredFilesView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.is_admin:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        expired_files = FileExport.objects.filter(
            expires_at__lt=timezone.now()
        )

        deleted_count = 0
        errors = []

        for export in expired_files:
            try:
                export.delete_file()
                export.delete()
                deleted_count += 1
            except Exception as e:
                errors.append({'file': export.file_name, 'error': str(e)})

        return Response({
            'success': True,
            'deleted_count': deleted_count,
            'errors': errors
        })