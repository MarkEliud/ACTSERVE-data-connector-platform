from django.apps import AppConfig

class Data_gridConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.data_grid'
    
    def ready(self):
        # Import signals when app is ready
        # import apps.data_grid.signals
        pass
