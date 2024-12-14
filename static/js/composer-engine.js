// Replace local URLs with your backend URL
const API_BASE_URL = 'https://your-backend-domain.com';

export class ComposerEngine {
    constructor(map) {
        this.map = map;
        this.currentProject = null;
        this.currentSequence = [];
        this.geocoder = new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            types: 'country,region,place',
            language: 'en'
        });
        this.loadAnimationPresets();
        this.usedColors = new Set();
        this.highlightLayers = [];
        this.loadStylePresets();
        
        // D3 categorical color schemes
        this.colorSchemes = {
            category10: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
            category20: ['#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c', '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5',
                        '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'],
            category20b: ['#393b79', '#5254a3', '#6b6ecf', '#9c9ede', '#637939', '#8ca252', '#b5cf6b', '#cedb9c', '#8c6d31', '#bd9e39',
                         '#e7ba52', '#e7cb94', '#843c39', '#ad494a', '#d6616b', '#e7969c', '#7b4173', '#a55194', '#ce6dbd', '#de9ed6'],
            category20c: ['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#e6550d', '#fd8d3c', '#fdae6b', '#fdd0a2', '#31a354', '#74c476',
                         '#a1d99b', '#c7e9c0', '#756bb1', '#9e9ac8', '#bcbddc', '#dadaeb', '#636363', '#969696', '#bdbdbd', '#d9d9d9']
        };
        this.currentScheme = this.colorSchemes.category20; // Default to category20
        this.styleId = 'cm3uy907600bn01sd131dhsqc'; // Your current style ID
    }

    async loadAnimationPresets() {
        try {
            const response = await fetch(`${API_BASE_URL}/static/data/presets.json`);
            if (!response.ok) throw new Error('Failed to load animation presets');
            const data = await response.json();
            this.presets = data.animations;
        } catch (error) {
            console.error('Error loading animation presets:', error);
            this.presets = [];
        }
    }

    async loadStylePresets() {
        try {
            const response = await fetch('/static/data/presets.json');
            if (!response.ok) throw new Error('Failed to load style presets');
            const data = await response.json();
            this.stylePresets = data.styles || [];
        } catch (error) {
            console.error('Error loading style presets:', error);
            this.stylePresets = [];
        }
    }

    async executeCommands(commandString) {
        const commands = commandString.split('\n').filter(cmd => cmd.trim() !== '');
        
        for (const command of commands) {
            try {
                await this.executeCommand(command.trim());
            } catch (error) {
                console.error(`Error executing command: ${command}`, error);
                throw error;
            }
        }
    }

    async executeCommand(command) {
        const parts = command.split(',').map(part => part.trim());
        const action = parts[0].toLowerCase();

        switch (action) {
            case 'project':
                await this.handleProject(parts);
                break;
            case 'sequence':
                await this.handleSequence(parts);
                break;
            case 'animate':
                await this.handleAnimate(parts);
                break;
            case 'focus':
                await this.handleFocus(parts);
                break;
            case 'highlight':
                await this.handleHighlight(parts);
                break;
            case 'wait':
                await this.handleWait(parts);
                break;
            case 'remove':
                await this.handleRemove(parts);
                break;
            case 'highlight2':
                await this.handleHighlight2(parts);
                break;
            case 'reset':
                await this.handleReset(parts);
                break;
            case 'trans':
                await this.handleTrans(parts);
                break;
            case 'set':
                await this.handleSet(parts);
                break;
            default:
                throw new Error(`Unknown command: ${action}`);
        }
    }

    async handleProject(parts) {
        if (parts.length < 2) {
            throw new Error('Project name is required');
        }

        const projectName = parts[1].replace(/["']/g, '');
        
        // Get the current command string from the composer
        const composerInput = document.querySelector('.composer-input');
        if (!composerInput) {
            throw new Error('Composer input not found');
        }

        // Simplified project structure
        this.currentProject = {
            name: projectName,
            commands: composerInput.value.split('\n')
                .filter(cmd => cmd.trim() !== '')
                .map(cmd => cmd.trim())
        };
        
        // Save project to file
        await this.saveProject();
    }

    async handleSequence(parts) {
        if (parts.length < 2) {
            throw new Error('Sequence name is required');
        }

        const sequenceName = parts[1].replace(/["']/g, '');
        this.currentSequence = [];
        
        if (this.currentProject) {
            this.currentProject.sequences[sequenceName] = this.currentSequence;
            // Save project after adding new sequence
            await this.saveProject();
        } else {
            // If no project is defined, just store sequence in memory
            this.currentSequence = [];
        }
    }

    async handleFocus(parts) {
        if (!parts[1] || !parts[1].trim()) {
            throw new Error('Focus command requires at least a preset ID or location');
        }

        const firstParam = parts[1].trim();
        const preset = this.presets.find(p => p.id === firstParam);

        if (preset) {
            // Using preset animation
            if (!parts[2] || !parts[2].trim()) {
                throw new Error('When using preset, a location parameter is required');
            }

            const locationStr = parts[2].replace(/["']/g, '').trim();
            const duration = parts[3] ? this.parseDuration(parts[3]) : 3000; // Default 3s
            const timeout = this.parseTimeout(parts); // Add timeout parsing

            // Get location coordinates
            let location;
            try {
                if (locationStr.match(/^-?\d+\.?\d*\s+-?\d+\.?\d*$/)) {
                    location = locationStr.split(' ').map(Number);
                } else {
                    location = await this.geocodeLocation(locationStr);
                }
            } catch (error) {
                throw new Error(`Could not find location: ${locationStr}`);
            }

            const settings = {
                center: location,
                zoom: preset.zoom,
                pitch: preset.pitch,
                bearing: preset.bearing,
                speed: preset.speed || 0.5,
                curve: preset.curve || 1,
                essential: preset.essential || true,
                duration: duration,
                timeout: timeout // Add timeout to settings
            };

            const animation = {
                id: `anim_${this.currentSequence.length + 1}`,
                type: 'flyTo',
                settings: settings
            };

            this.currentSequence.push(animation);
            await this.executeAnimation(animation);

        } else {
            // Direct location focusing
            const locationStr = firstParam;
            const duration = parts[2] ? this.parseDuration(parts[2]) : 3000;
            const zoom = parts[3] ? parseFloat(parts[3]) : 12;
            const pitch = parts[4] ? parseFloat(parts[4]) : 0;
            const bearing = parts[5] ? parseFloat(parts[5]) : 0;
            const curve = parts[6] ? Math.max(0.1, parseFloat(parts[6])) : 1;
            const timeout = this.parseTimeout(parts); // Add timeout parsing

            // Get location coordinates
            let location;
            try {
                if (locationStr.match(/^-?\d+\.?\d*\s+-?\d+\.?\d*$/)) {
                    location = locationStr.split(' ').map(Number);
                } else {
                    location = await this.geocodeLocation(locationStr);
                }
            } catch (error) {
                throw new Error(`Could not find location: ${locationStr}`);
            }

            const settings = {
                center: location,
                zoom: zoom,
                pitch: pitch,
                bearing: bearing,
                essential: true,
                duration: duration,
                animate: true,
                curve: curve,
                timeout: timeout // Add timeout to settings
            };

            const animation = {
                id: `anim_${this.currentSequence.length + 1}`,
                type: 'flyTo',
                settings: settings
            };

            this.currentSequence.push(animation);
            await this.executeAnimation(animation);
        }
    }

    getAvailableColors(numColorsNeeded) {
        // If we've used all colors in the scheme, reset the used colors
        if (this.usedColors.size >= this.currentScheme.length) {
            this.usedColors.clear();
        }

        const colors = [];
        let colorIndex = 0;

        // Keep trying until we have enough unique colors
        while (colors.length < numColorsNeeded) {
            // Get next color from the scheme, cycling through if needed
            const color = this.currentScheme[colorIndex % this.currentScheme.length];
            
            // Only use the color if it hasn't been used yet
            if (!this.usedColors.has(color)) {
                colors.push(color);
                this.usedColors.add(color);
            }
            colorIndex++;

            // Prevent infinite loop if we somehow can't get enough colors
            if (colorIndex > this.currentScheme.length * 2) {
                // If we run out of unique colors, start reusing them
                colors.push(this.currentScheme[colors.length % this.currentScheme.length]);
            }
        }

        return colors;
    }

    async handleHighlight(parts) {
        if (parts.length !== 4 && parts.length !== 5) {
            throw new Error('Highlight command requires: highlight, data_file, region/all, color/unique/style_id [, frame_number]');
        }

        const dataFile = parts[1].replace(/["']/g, '').trim();
        const regionSelector = parts[2].replace(/["']/g, '').trim();
        const styleOption = parts[3].replace(/["']/g, '').trim();
        const frameNumber = parts.length === 5 ? parseInt(parts[4]) : null;

        try {
            // Load and parse GeoJSON data
            const geoData = await this.loadGeoJSONData(dataFile);
            
            // Filter features
            const filteredData = this.filterFeatures(geoData, regionSelector);

            // Generate unique IDs
            const timestamp = Date.now();
            const layerIds = {
                layerId: `${dataFile}-fill-${timestamp}`,
                outlineId: `${dataFile}-outline-${timestamp}`,
                sourceId: `${dataFile}-${timestamp}`
            };

            // Add source
            this.map.addSource(layerIds.sourceId, {
                type: 'geojson',
                data: filteredData
            });

            // Check if styleOption is a preset
            const stylePreset = this.stylePresets.find(s => s.id === styleOption);

            if (stylePreset) {
                await this.applyPresetStyle(stylePreset, layerIds, filteredData, frameNumber);
            } else {
                await this.applyBasicStyle(styleOption, layerIds, filteredData);
            }

        } catch (error) {
            console.error('Error in highlight command:', error);
            throw new Error(`Failed to process highlight command: ${error.message}`);
        }
    }

    async loadGeoJSONData(dataFile) {
        // Remove .js extension if present
        const baseName = dataFile.replace(/\.js$/, '');
        
        // Try loading JSON file directly
        const response = await fetch(`/static/data/${baseName}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load data file: ${baseName}.json`);
        }

        const data = await response.json();
        return data;
    }

    filterFeatures(geoData, regionSelector) {
        if (regionSelector.toLowerCase() === 'all') {
            return geoData;
        }

        const filteredFeatures = geoData.features.filter(feature => {
            const propertiesToCheck = ['name', 'Name', 'NAME', 'region', 'Region', 'REGION'];
            return propertiesToCheck.some(prop => 
                feature.properties[prop] && 
                feature.properties[prop].toString().toLowerCase() === regionSelector.toLowerCase()
            );
        });

        if (filteredFeatures.length === 0) {
            throw new Error(`No features found matching region: ${regionSelector}`);
        }

        return { ...geoData, features: filteredFeatures };
    }

    async applyPresetStyle(stylePreset, layerIds, geoData, frameNumber = null) {
        const { layerId, outlineId, sourceId } = layerIds;

        // Add fill layer
        this.map.addLayer({
            'id': layerId,
            'type': 'fill',
            'source': sourceId,
            'paint': {
                'fill-color': stylePreset.fill,
                'fill-opacity': stylePreset.fillOpacity
            }
        });

        // Add base stroke
        this.map.addLayer({
            'id': outlineId,
            'type': 'line',
            'source': sourceId,
            'paint': {
                'line-color': stylePreset.stroke,
                'line-width': [
                    'interpolate',
                    ['exponential', 1.5],
                    ['zoom'],
                    5, stylePreset.strokeWidth,
                    10, stylePreset.strokeWidth * 2,
                    15, stylePreset.strokeWidth * 4
                ]
            }
        });

        if (stylePreset.animated) {
            await this.addAnimatedBorder(stylePreset, layerIds, frameNumber);
        } else {
            this.highlightLayers.push({ fillId: layerId, outlineId, sourceId });
        }
    }

    async applyBasicStyle(styleOption, layerIds, geoData) {
        const { layerId, outlineId, sourceId } = layerIds;
        const isUnique = styleOption.toLowerCase() === 'unique';

        // Add fill layer
        this.map.addLayer({
            'id': layerId,
            'type': 'fill',
            'source': sourceId,
            'paint': {
                'fill-color': isUnique ? 
                    this.createUniqueColorExpression(geoData) : 
                    styleOption,
                'fill-opacity': 0.4
            }
        });

        // Add outline layer
        this.map.addLayer({
            'id': outlineId,
            'type': 'line',
            'source': sourceId,
            'paint': {
                'line-color': '#000000',
                'line-width': 1
            }
        });

        // Track layers
        this.highlightLayers.push({ fillId: layerId, outlineId, sourceId });
    }

    createUniqueColorExpression(geoData) {
        const colors = this.getAvailableColors(geoData.features.length);
        
        return [
            'match',
            ['coalesce',
                ['get', 'name'],
                ['get', 'Name'],
                ['get', 'NAME'],
                ['get', 'region'],
                ['get', 'Region'],
                ['get', 'REGION']
            ],
            ...geoData.features.flatMap((feature, index) => {
                const propertyValue = ['name', 'Name', 'NAME', 'region', 'Region', 'REGION']
                    .map(prop => feature.properties[prop])
                    .find(val => val != null);
                return [propertyValue, colors[index]];
            }),
            colors[0]  // default color
        ];
    }

    async executeAnimation(animation) {
        return new Promise((resolve, reject) => {
            const { duration, timeout } = animation.settings;
            
            // Start the animation
            this.map.flyTo(animation.settings);
            
            // Set up timeout if specified
            const timeoutId = timeout ? setTimeout(() => {
                this.map.stop(); // Stop the current animation
                resolve();
            }, timeout) : null;
            
            // Set up normal duration handler
            const durationId = setTimeout(() => {
                if (timeoutId) clearTimeout(timeoutId);
                resolve();
            }, duration);

            // Handle animation completion
            this.map.once('moveend', () => {
                if (timeoutId) clearTimeout(timeoutId);
                clearTimeout(durationId);
                resolve();
            });
        });
    }

    parseDuration(durationStr) {
        const match = durationStr.match(/^(\d*\.?\d+)s$/);
        if (!match) {
            throw new Error(`Invalid duration format: ${durationStr}. Expected format: "0.1s", "1.5s" or "10s"`);
        }
        return parseFloat(match[1]) * 1000;
    }

    async saveProject() {
        if (!this.currentProject) {
            throw new Error('No active project to save');
        }

        try {
            const composerInput = document.querySelector('.composer-input');
            if (!composerInput) {
                throw new Error('Composer input not found');
            }

            // Convert to CSV format
            const commands = composerInput.value.split('\n')
                .filter(cmd => cmd.trim() !== '')
                .map(cmd => `command,${cmd}`);
                
            const csvContent = [
                `name,${this.currentProject.name}`,
                ...commands
            ].join('\n');

            const response = await fetch('/save-project', {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/csv',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({
                    name: this.currentProject.name,
                    content: csvContent
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save project');
            }
        } catch (error) {
            console.error('Error saving project:', error);
            throw error;
        }
    }

    getCSRFToken() {
        const name = 'csrftoken';
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

    async geocodeLocation(placeName) {
        const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(placeName)}.json`;
        const url = `${endpoint}?access_token=${mapboxgl.accessToken}&types=country,region,place`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Geocoding failed');
        }

        const data = await response.json();
        if (!data.features || data.features.length === 0) {
            throw new Error(`Location not found: ${placeName}`);
        }

        // Return coordinates in [lng, lat] format
        return data.features[0].center;
    }

    async handleWait(parts) {
        if (parts.length !== 2) {
            throw new Error('Wait command requires duration parameter');
        }

        const duration = this.parseDuration(parts[1]);
        await new Promise(resolve => setTimeout(resolve, duration));
    }

    async handleRemove(parts) {
        if (parts.length !== 2) {
            throw new Error('Remove command requires: remove, last/all');
        }

        const option = parts[1].toLowerCase().trim();
        
        if (option !== 'last' && option !== 'all') {
            throw new Error('Remove command second parameter must be "last" or "all"');
        }

        if (this.highlightLayers.length === 0) {
            return;
        }

        if (option === 'last') {
            const lastLayer = this.highlightLayers.pop();
            if (lastLayer.animationId) {
                cancelAnimationFrame(lastLayer.animationId);
            }
            if (lastLayer.animatedOutlineId) {
                this.map.removeLayer(lastLayer.animatedOutlineId);
            }
            if (this.map.getLayer(lastLayer.fillId)) {
                this.map.removeLayer(lastLayer.fillId);
            }
            if (this.map.getLayer(lastLayer.outlineId)) {
                this.map.removeLayer(lastLayer.outlineId);
            }
            if (lastLayer.snakeSourceId && this.map.getSource(lastLayer.snakeSourceId)) {
                this.map.removeSource(lastLayer.snakeSourceId);
            }
            if (this.map.getSource(lastLayer.sourceId)) {
                this.map.removeSource(lastLayer.sourceId);
            }
        } else if (option === 'all') {
            while (this.highlightLayers.length > 0) {
                const layer = this.highlightLayers.pop();
                if (layer.animationId) {
                    cancelAnimationFrame(layer.animationId);
                }
                if (layer.animatedOutlineId) {
                    this.map.removeLayer(layer.animatedOutlineId);
                }
                if (this.map.getLayer(layer.fillId)) {
                    this.map.removeLayer(layer.fillId);
                }
                if (this.map.getLayer(layer.outlineId)) {
                    this.map.removeLayer(layer.outlineId);
                }
                if (layer.snakeSourceId && this.map.getSource(layer.snakeSourceId)) {
                    this.map.removeSource(layer.snakeSourceId);
                }
                if (this.map.getSource(layer.sourceId)) {
                    this.map.removeSource(layer.sourceId);
                }
            }
            this.usedColors.clear();
        }
    }

    async handleHighlight2(parts) {
        if (parts.length !== 3) {
            throw new Error('Highlight2 command requires: highlight2, country_codes, color');
        }

        const countryCodes = parts[1].replace(/["']/g, '').trim().split(' ');
        const colorOption = parts[2].replace(/["']/g, '').trim();

        // Generate unique layer IDs using timestamp
        const timestamp = Date.now();
        const layerId = `country-boundaries-${timestamp}`;

        // Handle unique coloring
        let fillColor;
        if (colorOption.toLowerCase() === 'unique') {
            // Get available colors for the number of countries
            const availableColors = this.getAvailableColors(countryCodes.length);
            
            // Create a color expression for each country code
            fillColor = [
                'match',
                ['case',
                    ['has', 'iso_3166_1_alpha_3'],
                    ['get', 'iso_3166_1_alpha_3'],
                    ['get', 'iso_3166_1']  // fallback to alpha-2 code
                ],
                ...countryCodes.flatMap((code, index) => [
                    code,
                    availableColors[index % availableColors.length]
                ]),
                'rgba(0,0,0,0)' // default transparent color if no match
            ];

            // Track newly used colors
            availableColors.forEach(color => this.usedColors.add(color));
        } else {
            fillColor = colorOption;
        }

        // Add the layer using Mapbox's built-in country boundaries
        this.map.addLayer(
            {
                id: layerId,
                source: {
                    type: 'vector',
                    url: 'mapbox://mapbox.country-boundaries-v1',
                },
                'source-layer': 'country_boundaries',
                type: 'fill',
                paint: {
                    'fill-color': fillColor,
                    'fill-opacity': 0.4,
                }
            },
            'country-label'  // Add layer before labels
        );

        // Set filter to show only specified countries
        this.map.setFilter(layerId, [
            'any',
            [
                "in",
                ["get", "iso_3166_1_alpha_3"],
                ["literal", countryCodes]
            ],
            [
                "in",
                ["get", "iso_3166_1"],
                ["literal", countryCodes]
            ]
        ]);

        // Track the new highlight layer
        this.highlightLayers.push({
            fillId: layerId,
            outlineId: null,
            sourceId: null
        });
    }

    async handleReset(parts) {
        if (parts.length !== 1) {
            throw new Error('Reset command takes no parameters');
        }

        // First remove all highlights
        await this.handleRemove(['remove', 'all']);

        // Then reset the map view
        this.map.flyTo({
            center: [0, 20],
            zoom: 2,
            pitch: 0,
            bearing: 0,
            duration: 1
        });

        await new Promise(resolve => {
            this.map.once('moveend', () => {
                this.map.once('render', resolve);
            });
        });
    }

    async handleTrans(parts) {
        if (parts.length !== 3) {
            throw new Error('Trans command requires: trans, offset, duration');
        }

        const offsetStr = parts[1].trim();
        const duration = this.parseDuration(parts[2]);

        // Parse offset values [longitude, latitude]
        const offsets = offsetStr.split(' ').map(Number);
        if (offsets.length !== 2 || offsets.some(isNaN)) {
            throw new Error('Invalid offset format. Expected: "lng lat" (e.g., "-10 0")');
        }

        // Get current center
        const currentCenter = this.map.getCenter();
        const newCenter = [
            currentCenter.lng + offsets[0],
            currentCenter.lat + offsets[1]
        ];

        const animation = {
            id: `anim_${this.currentSequence.length + 1}`,
            type: 'flyTo',
            settings: {
                center: newCenter,
                zoom: this.map.getZoom(), // Keep current zoom
                pitch: this.map.getPitch(), // Keep current pitch
                bearing: this.map.getBearing(), // Keep current bearing
                speed: 0.1, // Reduced from 0.5 for smoother movement
                curve: 0, // Set to 0 for linear movement (no curve)
                essential: true,
                duration: duration
            }
        };

        this.currentSequence.push(animation);
        await this.executeAnimation(animation);
    }

    async handleSet(parts) {
        if (parts.length < 3) {
            throw new Error('Set command requires at least 3 parameters: set, feature, value');
        }

        const feature = parts[1].toLowerCase().trim();
        const value = parts[2].toLowerCase().trim();
        const target = parts[3] ? parts[3].toLowerCase().trim() : null;

        switch (feature) {
            case 'local borders':
                await this.setLocalBorders(value, target);
                break;
            case 'borders':
                await this.setBorders(value, target);
                break;
            default:
                throw new Error(`Unknown feature: ${feature}. Supported features: 'local borders', 'borders'`);
        }
    }

    async setLocalBorders(value, target) {
        if (value !== 'off') {
            throw new Error("Only 'off' value is supported for local borders currently");
        }

        // Get all admin-1 boundary layers
        const layers = this.map.getStyle().layers;
        const adminBoundaryLayers = layers.filter(layer => 
            layer.id.includes('admin-1') && 
            layer.source === 'composite'
        );

        for (const layer of adminBoundaryLayers) {
            if (target) {
                // Set filter to hide borders only for specified country
                this.map.setFilter(layer.id, [
                    'all',
                    ['!=', ['get', 'admin'], target],
                    layer.filter || ['boolean', true] // Keep existing filters if any
                ]);
            } else {
                // Hide all local borders
                this.map.setLayoutProperty(layer.id, 'visibility', 'none');
            }
        }
    }

    async setBorders(value, target) {
        if (value !== 'off') {
            throw new Error("Only 'off' value is supported for borders currently");
        }

        // Get all admin-0 boundary layers
        const layers = this.map.getStyle().layers;
        const countryBoundaryLayers = layers.filter(layer => 
            layer.id.includes('admin-0') && 
            layer.source === 'composite'
        );

        for (const layer of countryBoundaryLayers) {
            if (target) {
                // Set filter to hide borders only for specified country
                this.map.setFilter(layer.id, [
                    'all',
                    ['!=', ['get', 'admin'], target],
                    layer.filter || ['boolean', true] // Keep existing filters if any
                ]);
            } else {
                // Hide all country borders
                this.map.setLayoutProperty(layer.id, 'visibility', 'none');
            }
        }
    }

    async createFocusAnimation(parts) {
        if (!parts[1] || !parts[1].trim()) {
            throw new Error('Focus command requires at least a preset ID or location');
        }

        const firstParam = parts[1].trim();
        const preset = this.presets.find(p => p.id === firstParam);

        let settings;
        if (preset) {
            if (!parts[2] || !parts[2].trim()) {
                throw new Error('When using preset, a location parameter is required');
            }

            const locationStr = parts[2].replace(/["']/g, '').trim();
            const duration = parts[3] ? this.parseDuration(parts[3]) : 3000;

            // Get location coordinates
            const location = await this.getLocationCoordinates(locationStr);

            settings = {
                center: location,
                zoom: preset.zoom,
                pitch: preset.pitch,
                bearing: preset.bearing,
                speed: preset.speed || 0.5,
                curve: preset.curve || 1,
                essential: preset.essential || true,
                duration: duration
            };
        } else {
            const locationStr = firstParam;
            const duration = parts[2] ? this.parseDuration(parts[2]) : 3000;
            const zoom = parts[3] ? parseFloat(parts[3]) : 12;
            const pitch = parts[4] ? parseFloat(parts[4]) : 0;
            const bearing = parts[5] ? parseFloat(parts[5]) : 0;
            const curve = parts[6] ? Math.max(0.1, parseFloat(parts[6])) : 1;

            // Get location coordinates
            const location = await this.getLocationCoordinates(locationStr);

            settings = {
                center: location,
                zoom: zoom,
                pitch: pitch,
                bearing: bearing,
                essential: true,
                duration: duration,
                animate: true,
                curve: curve
            };
        }

        return {
            id: `anim_render_${Date.now()}`,
            type: 'flyTo',
            settings: settings
        };
    }

    // Helper method to get coordinates from location string
    async getLocationCoordinates(locationStr) {
        try {
            if (locationStr.match(/^-?\d+\.?\d*\s+-?\d+\.?\d*$/)) {
                return locationStr.split(' ').map(Number);
            } else {
                return await this.geocodeLocation(locationStr);
            }
        } catch (error) {
            throw new Error(`Could not find location: ${locationStr}`);
        }
    }

    async addAnimatedBorder(stylePreset, layerIds, frameNumber = null) {
        const { sourceId } = layerIds;
        const animatedOutlineId = `${layerIds.outlineId}-animated`;
        
        // Get all coordinates from the source data
        const sourceData = this.map.getSource(sourceId)._data;
        let allCoords = [];
        
        // Extract coordinates from all features
        if (sourceData.type === 'FeatureCollection') {
            sourceData.features.forEach(feature => {
                if (feature.geometry.type === 'Polygon') {
                    allCoords = allCoords.concat(feature.geometry.coordinates[0]);
                } else if (feature.geometry.type === 'MultiPolygon') {
                    feature.geometry.coordinates.forEach(polygon => {
                        allCoords = allCoords.concat(polygon[0]);
                    });
                }
            });
        }

        // Create a new source for the animated line
        const snakeSourceId = `${sourceId}-snake`;
        this.map.addSource(snakeSourceId, {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'LineString',
                    'coordinates': []
                }
            }
        });

        // Add the animated line layer
        this.map.addLayer({
            'id': animatedOutlineId,
            'type': 'line',
            'source': snakeSourceId,
            'paint': {
                'line-color': stylePreset.animatedStroke,
                'line-width': [
                    'interpolate',
                    ['exponential', 1.5],
                    ['zoom'],
                    5, stylePreset.strokeWidth * 1.5,
                    10, stylePreset.strokeWidth * 3,
                    15, stylePreset.strokeWidth * 6
                ]
            }
        });

        const duration = stylePreset.duration || 8000;
        const fps = 30;
        const totalFrames = Math.floor((duration / 1000) * fps);
        const pointsPerFrame = allCoords.length / totalFrames;

        if (frameNumber !== null) {
            // Calculate the actual frame number by using modulo to handle rotation
            const actualFrame = frameNumber % totalFrames;
            
            // If frame number is provided, draw that specific frame state
            const pointCount = Math.min(
                Math.floor(actualFrame * pointsPerFrame),
                allCoords.length
            );
            
            // Update the line with calculated points
            this.map.getSource(snakeSourceId).setData({
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: allCoords.slice(0, pointCount + 1)
                }
            });

            // Track the layers without animation
            this.highlightLayers.push({
                fillId: layerIds.layerId,
                outlineId: layerIds.outlineId,
                sourceId: layerIds.sourceId,
                animatedOutlineId,
                snakeSourceId
            });
        } else {
            // Regular animated version
            let frameCount = 0;
            let lastFrameTime = 0;
            const frameInterval = 1000 / fps;

            const animate = (timestamp) => {
                if (timestamp - lastFrameTime >= frameInterval) {
                    frameCount = (frameCount + 1) % totalFrames;
                    const pointCount = Math.min(
                        Math.floor(frameCount * pointsPerFrame),
                        allCoords.length
                    );
                    
                    this.map.getSource(snakeSourceId).setData({
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'LineString',
                            coordinates: allCoords.slice(0, pointCount + 1)
                        }
                    });

                    lastFrameTime = timestamp;
                }

                const animationId = requestAnimationFrame(animate);
                return animationId;
            };

            const animationId = requestAnimationFrame(animate);

            // Track the layers with animation
            this.highlightLayers.push({
                fillId: layerIds.layerId,
                outlineId: layerIds.outlineId,
                sourceId: layerIds.sourceId,
                animatedOutlineId,
                snakeSourceId,
                animationId
            });
        }
    }

    parseTimeout(parts) {
        const timeoutParam = parts.find(part => part.trim().toLowerCase().startsWith('timeout'));
        if (!timeoutParam) return null;

        const [_, duration] = timeoutParam.trim().split(/\s+/);
        if (!duration) return null;

        return this.parseDuration(duration);
    }
} 