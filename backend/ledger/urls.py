from django.urls import path
from . import views

urlpatterns = [
    path('api/parse/', views.parse_input, name='parse_input'),
    path('api/transactions/', views.get_transactions, name='get_transactions'),
    path('api/transactions/clear/', views.clear_transactions, name='clear_transactions'),
    path('api/seed/', views.seed_database, name='seed_database'),
    path('', views.api_index, name='api_index'),
]
