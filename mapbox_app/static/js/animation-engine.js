async handleProject(projectName) {
    try {
        // Try to load existing project
        const response = await fetch(`/api/load_project/${projectName}/`);
        
        if (response.ok) {
            this.currentProject = await response.json();
        } else if (response.status === 404) {
            // Create new project
            this.currentProject = {
                name: projectName,
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                commands: []
            };
            
            // Save new project
            await this.saveProject();
        } else {
            throw new Error(`Failed to load project: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error handling project:', error);
        throw error;
    }
}

async saveProject() {
    if (!this.currentProject) return;

    try {
        const response = await fetch('/api/save_project/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')  // Add CSRF token
            },
            body: JSON.stringify(this.currentProject)
        });

        if (!response.ok) {
            throw new Error('Failed to save project');
        }
    } catch (error) {
        console.error('Error saving project:', error);
        throw error;
    }
}

// Helper function to get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
} 