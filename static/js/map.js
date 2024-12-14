import { SidebarControls } from './side-bar.js';

// Set access token from environment variable
mapboxgl.accessToken = window.MAPBOX_ACCESS_TOKEN;

// Initialize map with a view of the entire world
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/ashetools/cm3uy907600bn01sd131dhsqc',
    center: [0, 20],
    zoom: 2,
    renderWorldCopies: false,
    preserveDrawingBuffer: true,
    pixelRatio: window.devicePixelRatio || 1
});

// After map initialization and before the load event, initialize SidebarControls
const sidebarControls = new SidebarControls(map);

// Add navigation controls to the map (top-right corner)
const navControl = new mapboxgl.NavigationControl();
map.addControl(navControl, 'top-right');

// Add fullscreen control
const fullscreenControl = new mapboxgl.FullscreenControl();
map.addControl(fullscreenControl, 'top-right');

// ResizeObserver ensures map canvas always fills container
const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
        map.resize();
    }
});

// Observe the container for size changes
const mapContainer = document.querySelector('.map-container');
resizeObserver.observe(mapContainer);

// Wait for map to load
map.on('load', () => {
    console.log('Map loaded successfully');

    // Remove disputed territory labels
    const labelLayers = [
        'country-label',
    ];

    labelLayers.forEach(layer => {
        if (map.getLayer(layer)) {
            // Filter out disputed territories using the 'disputed' property
            map.setFilter(layer, ['!=', ['get', 'disputed'], 'true']);
        }
    });

    // Apply default aspect ratio
    sidebarControls.applyAspectRatio('Default (16:9)');
});

map.on('error', (e) => {
    console.error('Map error:', e);
});