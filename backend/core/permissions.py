from rest_framework import permissions


class IsAuthenticated(permissions.IsAuthenticated):
    """
    Custom authentication permission with detailed error messages.
    """
    message = 'Authentication credentials were not provided.'


class IsAdmin(permissions.BasePermission):
    """
    Custom permission to allow only administrators.
    """
    message = 'Administrator access required.'

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin

    def has_object_permission(self, request, view, obj):
        return request.user and request.user.is_admin


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to allow only owners or administrators.
    """
    message = 'You do not have permission to access this resource.'

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Admin has full access
        if request.user.is_admin:
            return True

        # Direct ownership check
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user

        if hasattr(obj, 'owner'):
            return obj.owner == request.user

        if hasattr(obj, 'user'):
            return obj.user == request.user

        # DataRow: ownership is through dataset
        if hasattr(obj, 'dataset'):
            dataset = obj.dataset
            if hasattr(dataset, 'created_by'):
                return dataset.created_by == request.user

        # ExtractionBatch: ownership is through job
        if hasattr(obj, 'job'):
            job = obj.job
            if hasattr(job, 'created_by'):
                return job.created_by == request.user

        return False


class IsOwner(permissions.BasePermission):
    """
    Custom permission to allow only owners (not admins).
    """
    message = 'You do not own this resource.'

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        return False


class CanAccessFile(permissions.BasePermission):
    """
    Custom permission for file access control.
    Checks if user has access based on ownership, sharing, or public status.
    """
    message = 'You do not have access to this file.'

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        # Admin has full access
        if request.user.is_admin:
            return True

        # Owner has access
        if hasattr(obj, 'created_by') and obj.created_by == request.user:
            return True

        # Check public access
        if hasattr(obj, 'is_public') and obj.is_public:
            return True

        return False


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to allow read access to all, write only to admins.
    """
    message = 'Write access requires administrator privileges.'

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_admin