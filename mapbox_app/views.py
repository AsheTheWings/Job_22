from django.shortcuts import render
from django.http import JsonResponse
import json
import os
from django.conf import settings

def index(request):
    return render(request, 'mapbox_app/index.html')

def save_project(request):
    if request.method == 'POST':
        try:
            project_data = json.loads(request.body)
            project_name = project_data.get('name')
            
            # Create projects directory if it doesn't exist
            projects_dir = os.path.join(settings.BASE_DIR, 'mapbox_app', 'static', 'projects')
            os.makedirs(projects_dir, exist_ok=True)
            
            # Save project file
            project_path = os.path.join(projects_dir, f"{project_name}.json")
            with open(project_path, 'w') as f:
                json.dump(project_data, f)
            
            return JsonResponse({'status': 'success'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

def load_project(request, project_name):
    try:
        project_path = os.path.join(settings.BASE_DIR, 'mapbox_app', 'static', 'projects', f"{project_name}.json")
        
        if not os.path.exists(project_path):
            return JsonResponse({'status': 'error', 'message': 'Project not found'}, status=404)
        
        with open(project_path, 'r') as f:
            project_data = json.load(f)
        
        return JsonResponse(project_data)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500) 