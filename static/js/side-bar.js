import { Composer } from './composer.js';

class SidebarToggle {
    constructor() {
        this.sidebar = document.querySelector('.sidebar');
        this.mainContent = document.querySelector('.main-content');
        this.isVisible = true;
        this.createToggle();
        this.init();
    }

    createToggle() {
        // Create wrapper for toggle
        this.toggleWrapper = document.createElement('div');
        this.toggleWrapper.className = 'toggle-wrapper';
        
        // Create toggle button
        this.toggleButton = document.createElement('button');
        this.toggleButton.className = 'toggle-button';
        
        // Add SVG icon
        this.toggleButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 6L9 12L15 18" stroke="#e1e1e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        
        // Append to sidebar instead of body
        this.toggleWrapper.appendChild(this.toggleButton);
        this.sidebar.appendChild(this.toggleWrapper);
    }

    init() {
        this.toggleButton.addEventListener('click', () => this.toggle());
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
    }

    toggle() {
        this.isVisible = !this.isVisible;
        
        if (this.isVisible) {
            this.sidebar.style.transform = 'translateX(0)';
            this.mainContent.style.gridColumn = '15 / 65';
            this.toggleButton.classList.remove('collapsed');
        } else {
            this.sidebar.style.transform = 'translateX(-100%)';
            this.mainContent.style.gridColumn = '1 / 65';
            this.toggleButton.classList.add('collapsed');
        }
    }

    handleResize() {
        if (window.innerWidth <= 768) {
            this.sidebar.style.transform = 'translateX(-100%)';
            this.mainContent.style.gridColumn = '1 / -1';
            this.toggleWrapper.style.display = 'none';
            this.isVisible = false;
        } else {
            this.toggleWrapper.style.display = 'block';
            if (this.isVisible) {
                this.sidebar.style.transform = 'translateX(0)';
                this.mainContent.style.gridColumn = '15 / 65';
            }
        }
    }
}

class SidebarControls {
    constructor(map) {
        this.map = map;
        this.mapContainer = document.getElementById('map');
        this.initialMapConfig = {
            container: 'map',
            style: 'mapbox://styles/ashetools/cm3uy907600bn01sd131dhsqc',
            center: [0, 20],
            zoom: 2,
            renderWorldCopies: false
        };
        this.sidebar = document.querySelector('.sidebar');
        this.setupStyles();
        this.setupAspectRatios();
        this.setupResetButton();
        this.setupProjectSection();

        this.sidebar.__sidebarInstance = this;
    }

    async reinitializeMap() {
        // Remove the old map instance
        this.map.remove();

        // Create a new map instance
        this.map = new mapboxgl.Map(this.initialMapConfig);

        // Reinitialize controls
        const navControl = new mapboxgl.NavigationControl();
        this.map.addControl(navControl, 'top-right');

        const fullscreenControl = new mapboxgl.FullscreenControl();
        this.map.addControl(fullscreenControl, 'top-right');

        // Wait for the new map to load
        return new Promise((resolve) => {
            this.map.on('load', () => {
                // Remove disputed territory labels
                const labelLayers = ['country-label'];
                labelLayers.forEach(layer => {
                    if (this.map.getLayer(layer)) {
                        this.map.setFilter(layer, ['!=', ['get', 'disputed'], 'true']);
                    }
                });
                resolve();
            });
        });
    }

    setupStyles() {
        const styles = {
            'custom-1': 'mapbox://styles/ashetools/cm3uy907600bn01sd131dhsqc',
            'Satellite': 'mapbox://styles/mapbox/satellite-v9',
            'Light': 'mapbox://styles/mapbox/light-v11',
            'Dark': 'mapbox://styles/mapbox/dark-v11',
            'Streets': 'mapbox://styles/mapbox/streets-v12',
            'Outdoors': 'mapbox://styles/mapbox/outdoors-v12',
            'Satellite Streets': 'mapbox://styles/mapbox/satellite-streets-v12',
            'Navigation Day': 'mapbox://styles/mapbox/navigation-day-v1',
            'Navigation Night': 'mapbox://styles/mapbox/navigation-night-v1',
            'Monochrome': 'mapbox://styles/mapbox/monochrome-v1'
        };

        const styleSelector = document.createElement('select');
        styleSelector.className = 'style-selector';

        const styleSelectorTitle = document.createElement('h3');
        styleSelectorTitle.textContent = 'Map Style';
        styleSelectorTitle.style.color = 'white';
        styleSelectorTitle.style.marginBottom = '10px';

        Object.keys(styles).forEach(style => {
            const option = document.createElement('option');
            option.value = styles[style];
            option.text = style;
            styleSelector.appendChild(option);
        });

        styleSelector.addEventListener('change', (e) => {
            this.map.setStyle(e.target.value);
        });

        this.sidebar.appendChild(styleSelectorTitle);
        this.sidebar.appendChild(styleSelector);
    }

    setupAspectRatios() {
        const aspectRatios = {
            'Default (16:9)': { width: 16, height: 9 },
            'Phone Vertical (9:19.5)': { width: 9, height: 19.5 }
        };

        const aspectRatioTitle = document.createElement('h3');
        aspectRatioTitle.textContent = 'View Mode';
        aspectRatioTitle.style.color = 'white';
        aspectRatioTitle.style.marginBottom = '10px';
        aspectRatioTitle.style.marginTop = '20px';

        const aspectRatioSelector = document.createElement('select');
        aspectRatioSelector.className = 'style-selector';

        Object.keys(aspectRatios).forEach(ratio => {
            const option = document.createElement('option');
            option.value = ratio;
            option.text = ratio;
            aspectRatioSelector.appendChild(option);
        });

        aspectRatioSelector.addEventListener('change', (e) => {
            this.applyAspectRatio(e.target.value);
        });

        this.sidebar.appendChild(aspectRatioTitle);
        this.sidebar.appendChild(aspectRatioSelector);
    }

    applyAspectRatio(ratioName) {
        const container = document.querySelector('.map-container');
        
        container.classList.remove('default-ratio', 'phone-vertical-ratio');
        
        if (ratioName === 'Phone Vertical (9:19.5)') {
            container.classList.add('phone-vertical-ratio');
        } else {
            container.classList.add('default-ratio');
        }
        
        void container.offsetHeight;
        
        this.map.resize();
        
        setTimeout(() => {
            this.map.resize();
            this.map.triggerRepaint();
        }, 300);
    }

    setupResetButton() {
        const resetButton = document.createElement('button');
        resetButton.textContent = 'Reset View';
        resetButton.className = 'reset-button';

        resetButton.addEventListener('click', () => {
            this.map.flyTo({
                center: [0, 20],
                zoom: 2,
                pitch: 0,
                bearing: 0,
                duration: 3000
            });
        });

        this.sidebar.appendChild(resetButton);
    }

    setupProjectSection() {
        const composerTitle = document.createElement('h3');
        composerTitle.textContent = 'Composer';
        composerTitle.style.color = 'white';
        composerTitle.style.marginBottom = '10px';
        composerTitle.style.marginTop = '20px';

        // Container for buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'composer-button-container';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';

        // Build button
        const buildButton = document.createElement('button');
        buildButton.textContent = 'Build';
        buildButton.className = 'sidebar-button';
        
        // Add button to container
        buttonContainer.appendChild(buildButton);
        
        // Initialize Composer
        this.composer = new Composer(this.map, this);
        
        // Add click handler for build button
        buildButton.addEventListener('click', () => {
            this.composer.show();
        });

        // Append title and button container to sidebar
        this.sidebar.appendChild(composerTitle);
        this.sidebar.appendChild(buttonContainer);
    }
}

// Initialize both classes when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SidebarToggle();
    // SidebarControls will be initialized after map is created
});

// Export SidebarControls for use in map.js
export { SidebarControls }; 