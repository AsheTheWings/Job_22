from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.views.decorators.http import require_http_methods
import json
import os
from django.conf import settings
import requests
import shutil

@ensure_csrf_cookie
def index(request):
    return render(request, 'index.html', {
        'mapbox_token': settings.MAPBOX_ACCESS_TOKEN
    })

def save_project(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            projects_dir = os.path.join(settings.BASE_DIR, 'static', 'projects')
            
            # Create projects directory if it doesn't exist
            os.makedirs(projects_dir, exist_ok=True)
            
            # Save project file as CSV
            file_path = os.path.join(projects_dir, f"{data['name']}.csv")
            
            with open(file_path, 'w', newline='') as f:
                f.write(data['content'])
            
            return JsonResponse({
                'status': 'success',
                'filepath': file_path
            })
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Method not allowed'
    }, status=405)

def save_frame(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            image_url = data['url']
            save_path = os.path.join(settings.BASE_DIR, data['path'].lstrip('/'))
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            
            # Download image from Mapbox
            response = requests.get(image_url)
            if response.status_code == 200:
                with open(save_path, 'wb') as f:
                    f.write(response.content)
                
                return JsonResponse({
                    'status': 'success',
                    'path': save_path
                })
            else:
                return JsonResponse({
                    'status': 'error',
                    'message': f'Failed to download image: {response.status_code}'
                }, status=500)
                
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Method not allowed'
    }, status=405)

def create_directory(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            dir_path = os.path.join(settings.BASE_DIR, data['path'].lstrip('/'))
            
            # Create directory if it doesn't exist
            os.makedirs(dir_path, exist_ok=True)
            
            return JsonResponse({
                'status': 'success',
                'path': dir_path
            })
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Method not allowed'
    }, status=405)

@csrf_protect
@require_http_methods(["POST"])
def copy_frame(request):
    try:
        data = json.loads(request.body)
        source_path = os.path.join(settings.BASE_DIR, data['sourcePath'].lstrip('/'))
        target_path = os.path.join(settings.BASE_DIR, data['targetPath'].lstrip('/'))
        
        # Ensure source file exists
        if not os.path.exists(source_path):
            raise FileNotFoundError(f"Source file not found: {source_path}")
        
        # Create target directory structure
        target_dir = os.path.dirname(target_path)
        os.makedirs(target_dir, exist_ok=True)
        
        # Copy the file
        shutil.copy2(source_path, target_path)
        
        return JsonResponse({
            'status': 'success',
            'message': 'Frame copied successfully'
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_protect
@require_http_methods(["POST"])
def save_canvas_frame(request):
    try:
        if 'image' not in request.FILES:
            return JsonResponse({
                'status': 'error',
                'message': 'No image file provided'
            }, status=400)

        image_file = request.FILES['image']
        timestamp_folder = request.POST.get('timestamp_folder')
        save_path = request.POST.get('path')

        if not all([timestamp_folder, save_path]):
            return JsonResponse({
                'status': 'error',
                'message': 'Missing required parameters'
            }, status=400)

        save_path = os.path.abspath(os.path.join(settings.BASE_DIR, save_path.lstrip('/')))
        if not save_path.startswith(str(settings.BASE_DIR)):
            return JsonResponse({
                'status': 'error',
                'message': 'Invalid save path'
            }, status=400)

        # Create only the timestamp folder
        os.makedirs(os.path.dirname(save_path), exist_ok=True)

        with open(save_path, 'wb') as f:
            for chunk in image_file.chunks():
                f.write(chunk)

        return JsonResponse({
            'status': 'success',
            'path': save_path
        })

    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500) 