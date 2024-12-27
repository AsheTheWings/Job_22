from pathlib import Path
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ... other settings ...

# Mapbox settings
MAPBOX_ACCESS_TOKEN = os.getenv('MAPBOX_ACCESS_TOKEN') 