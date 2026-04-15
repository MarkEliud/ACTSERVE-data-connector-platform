from django.apps import AppConfig

class ExtractionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.extraction'
    
    def ready(self):
        # Import signals when app is ready
        # import apps.extraction.signals
        pass
