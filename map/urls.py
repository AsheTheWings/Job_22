from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('save-project', views.save_project, name='save_project'),
    path('save-frame', views.save_frame, name='save_frame'),
    path('api/create-directory', views.create_directory, name='create_directory'),
    path('copy-frame', views.copy_frame, name='copy-frame'),
    path('save-canvas-frame', views.save_canvas_frame, name='save-canvas-frame'),
] 