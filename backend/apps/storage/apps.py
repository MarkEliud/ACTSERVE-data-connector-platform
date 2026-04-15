from django.apps import AppConfig

class StorageConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.storage'
    
    def ready(self):
        # Import signals when app is ready
        # import apps.storage.signals
        pass
