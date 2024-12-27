import { playAct1 } from './animations/act_1.js';
import { moroccoRegions } from './data/morocco-regions.js';
import { SidebarControls } from './side-bar.js';

// Set access token directly (for browser environment)
mapboxgl.accessToken = 'pk.eyJ1IjoiYXNoZXRvb2xzIiwiYSI6ImNtM3V3NG1rMTBsN3cycXF0cWZod2xvOWoifQ.tCyKpVJRap_tioAyLF7C3g';

// Initialize map with a view of the entire world
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/ashetools/cm3uy907600bn01sd131dhsqc',
    center: [0, 20],
    zoom: 2,
    renderWorldCopies: false
});

// After map initialization and before the load event, initialize SidebarControls
const sidebarControls = new SidebarControls(map);

// Add navigation controls to the map (top-right corner)
const navControl = new mapboxgl.NavigationControl();
map.addControl(navControl, 'top-right');

// Add fullscreen control
const fullscreenControl = new mapboxgl.FullscreenControl();
map.addControl(fullscreenControl, 'top-right');

// Create a ResizeObserver to watch the container size
const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
        // Ensure the map fills its container
        map.resize();
    }
});

// Start observing the map container
const mapContainer = document.querySelector('.map-container');
resizeObserver.observe(mapContainer);

// Wait for map to load
map.on('load', () => {
    console.log('Map loaded successfully');
    
    // Add source for Morocco regions
    map.addSource('morocco-regions', {
        type: 'geojson',
        data: moroccoRegions,
        generateId: true
    });

    // Add a layer to display the regions
    map.addLayer({
        'id': 'morocco-regions-fill',
        'type': 'fill',
        'source': 'morocco-regions',
        'paint': {
            'fill-color': [
                'match',
                ['get', 'name'],
                'Tanger-Tétouan-Al Hoceïma', '#FF5733',
                'Oriental', '#33FF57',
                'Fès-Meknès', '#3357FF',
                'Rabat-Salé-Kénitra', '#FF33F6',
                'Béni Mellal-Khénifra', '#33FFF6',
                'Casablanca-Settat', '#F6FF33',
                'Marrakech-Safi', '#FF8333',
                'Drâa-Tafilalet', '#33FF83',
                'Souss-Massa', '#8333FF',
                'Guelmim-Oued Noun', '#FF3383',
                'Laâyoune-Sakia El Hamra', '#33FFF6',
                'Dakhla-Oued Ed-Dahab', '#F6FF33',
                '#000000' // default color
            ],
            'fill-opacity': 0.5
        }
    });

    // Add outline layer for the regions
    map.addLayer({
        'id': 'morocco-regions-outline',
        'type': 'line',
        'source': 'morocco-regions',
        'paint': {
            'line-color': '#000',
            'line-width': 1
        }
    });

    // Wait 2 seconds before starting the animation
    setTimeout(() => {
        playAct1(map);
    }, 2000);

    // Hide administrative boundaries
    const borderLayers = [
        'admin-0-boundary-disputed',
        'admin-1-boundary',
        'admin-1-boundary-bg',
        'admin-2-boundary',
        'admin-2-boundary-bg',
        'admin-3-boundary',
        'admin-3-boundary-bg',
        'admin-4-boundary',
        'admin-4-boundary-bg'
    ];

    borderLayers.forEach(layer => {
        if (map.getLayer(layer)) {
            map.setLayoutProperty(layer, 'visibility', 'none');
        }
    });

    // Add filter to remove target countries label
    const countryLabelLayers = [
        'country-label',  // Main country label layer
        'settlement-major-label',  // City labels
        'settlement-minor-label'   // Smaller settlement labels
    ];

    countryLabelLayers.forEach(layer => {
        if (map.getLayer(layer)) {
            map.setFilter(layer, ['!=', ['get', 'name_en'], 'Western Sahara']);
        }
    });

    // Apply default aspect ratio
    sidebarControls.applyAspectRatio('Default (16:9)');
});

map.on('error', (e) => {
    console.error('Map error:', e);
});