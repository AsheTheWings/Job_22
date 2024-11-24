from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/save_project/', views.save_project, name='save_project'),
    path('api/load_project/<str:project_name>/', views.load_project, name='load_project'),
] 