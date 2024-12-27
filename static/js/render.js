export class Renderer {
    constructor(composerEngine) {
        this.composerEngine = composerEngine;
        this.isRendering = false;
        this.abortController = null;
        this.renderTimestamp = null;
        this.createProgressPopup();
        this.storedCameraPositions = new Map();
    }

    createProgressPopup() {
        // Create progress popup
        this.progressPopup = document.createElement('div');
        this.progressPopup.className = 'progress-popup';
        this.progressPopup.style.display = 'none';

        // Create backdrop for centering
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'interpreter-popup';  // Reuse interpreter popup backdrop
        this.backdrop.style.display = 'none';
        
        // Create header with title and close button
        const header = document.createElement('div');
        header.className = 'progress-header';
        header.innerHTML = `
            <span>Rendering MP4 Video</span>
            <button class="progress-close">&times;</button>
        `;

        // Create content container
        const content = document.createElement('div');
        content.className = 'progress-content';

        // Create progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.innerHTML = '<div class="progress-fill"></div>';

        // Create status text
        const status = document.createElement('div');
        status.className = 'progress-status';
        status.innerHTML = `
            <span class="progress-text">Recording Animation...</span>
            <span class="progress-percentage">0%</span>
        `;

        // Assemble popup
        content.appendChild(progressBar);
        content.appendChild(status);
        this.progressPopup.appendChild(header);
        this.progressPopup.appendChild(content);

        // Change this part:
        // const mainContent = document.querySelector('.main-content');
        // this.backdrop.appendChild(this.progressPopup);
        // mainContent.appendChild(this.backdrop);

        // Instead, append to the map container:
        const mapContainer = this.composerEngine.map.getContainer();
        this.backdrop.appendChild(this.progressPopup);
        mapContainer.appendChild(this.backdrop);

        // Update close button handler to terminate rendering
        const closeBtn = this.progressPopup.querySelector('.progress-close');
        closeBtn.addEventListener('click', () => {
            this.terminateRendering();
        });

        // Store elements for later use
        this.progressFill = this.progressPopup.querySelector('.progress-fill');
        this.progressText = this.progressPopup.querySelector('.progress-text');
        this.progressPercentage = this.progressPopup.querySelector('.progress-percentage');
    }

    updateProgress(current, total, phase = 'Recording Animation...') {
        const percentage = Math.round((current / total) * 100);
        this.progressFill.style.width = `${percentage}%`;
        this.progressText.textContent = phase;
        this.progressPercentage.textContent = `${percentage}%`;
    }

    async terminateRendering() {
        if (this.isRendering) {
            this.abortController?.abort();
            this.isRendering = false;
            this.backdrop.style.display = 'none';
            
            // Use reset command instead of manual position reset
            await this.composerEngine.executeCommand('reset');

            // Show termination message
            const toast = document.createElement('div');
            toast.className = 'error-toast';
            toast.textContent = 'Rendering cancelled';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    }

    async copyFrame(sourcePath, targetPath) {
        try {
            const response = await fetch('/copy-frame', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.composerEngine.getCSRFToken()
                },
                body: JSON.stringify({
                    sourcePath: sourcePath,
                    targetPath: targetPath
                })
            });

            if (!response.ok) {
                throw new Error('Failed to copy frame');
            }
        } catch (error) {
            throw new Error(`Failed to copy frame: ${error.message}`);
        }
    }

    async waitForMapRender(map) {
        return new Promise(resolve => {
            if (!map.isStyleLoaded()) {
                map.once('styledata', () => {
                    map.once('render', () => resolve());
                });
            } else {
                map.once('render', () => resolve());
            }
        });
    }

    async renderCommands(commands) {
        if (this.isRendering) {
            throw new Error('Another render is already in progress');
        }

        // Enter fullscreen at the start
        const mapContainer = this.composerEngine.map.getContainer();
        try {
            if (!document.fullscreenElement && mapContainer.requestFullscreen) {
                await mapContainer.requestFullscreen();
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Setup phase
            this.isRendering = true;
            this.abortController = new AbortController();
            this.renderTimestamp = Date.now();
            this.backdrop.style.display = 'flex';
            this.progressPopup.style.display = 'block';
            
            const map = this.composerEngine.map;
            const fps = 30;
            
            // First phase: Record animations
            this.updateProgress(0, 100, 'Recording Animations...');
            await this.recordAnimations(commands, map);
            
            if (this.abortController.signal.aborted) {
                throw new Error('Rendering cancelled');
            }

            // Reset between phases
            await this.composerEngine.executeCommand('reset');
            
            // Second phase: Render frames
            await this.renderFrames(commands, map, fps);

            // Cleanup and return
            this.updateProgress(100, 100, 'Complete');
            setTimeout(() => {
                this.backdrop.style.display = 'none';
            }, 1500);

            return {
                type: 'success',
                message: 'Rendering complete',
                framesPath: `/static/data/frames/${this.renderTimestamp}`
            };

        } catch (error) {
            this.backdrop.style.display = 'none';
            if (error.message === 'Rendering cancelled') {
                return undefined;
            }
            throw new Error(`Render failed: ${error.message}`);
        } finally {
            // Only exit fullscreen if we entered it and rendering is complete
            if (document.fullscreenElement && document.exitFullscreen) {
                await document.exitFullscreen();
            }
            this.isRendering = false;
            this.abortController = null;
            this.renderTimestamp = null;
        }
    }

    async recordAnimations(commands, map) {
        // Calculate total duration for progress tracking
        let totalDuration = 0;
        let recordedDuration = 0;
        
        // First pass - calculate total duration
        for (const command of commands) {
            const parts = command.split(',').map(part => part.trim());
            const action = parts[0].toLowerCase();
            
            if (action === 'focus') {
                const duration = parts[2] ? this.parseDuration(parts[2]) : 3000; // Default 3s
                totalDuration += duration;
            }
        }

        // Second pass - record animations
        for (const command of commands) {
            if (this.abortController.signal.aborted) break;

            const parts = command.split(',').map(part => part.trim());
            const action = parts[0].toLowerCase();

            if (action === 'focus') {
                const animation = await this.composerEngine.createFocusAnimation(parts);
                const durationMs = animation.settings.duration;
                const animationFrames = durationMs === 0 ? 1 : Math.ceil((durationMs / 1000) * 30);
                
                // Store camera positions during animation
                const cameraPositions = [];
                map.flyTo(animation.settings);
                
                if (durationMs === 0) {
                    await this.waitForMapRender(map);
                    cameraPositions.push(this.getCurrentCameraPosition(map));
                } else {
                    const frameInterval = durationMs / animationFrames;
                    for (let i = 0; i < animationFrames; i++) {
                        cameraPositions.push(this.getCurrentCameraPosition(map));
                        await new Promise(resolve => setTimeout(resolve, frameInterval));
                        
                        // Update progress based on recorded duration
                        recordedDuration = Math.min(recordedDuration + frameInterval, totalDuration);
                        const progress = Math.round((recordedDuration / totalDuration) * 100);
                        this.updateProgress(progress, 100, 'Recording Animations...');
                    }
                }
                
                this.storedCameraPositions.set(command, cameraPositions);
            }
        }
    }

    getCurrentCameraPosition(map) {
        return {
            center: map.getCenter(),
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch()
        };
    }

    async renderFrames(commands, map, fps) {
        let currentFrame = 0;
        let renderedFrames = 0;
        const activeHighlightCommands = [];

        // Calculate total frames first
        let totalFrames = 0;
        for (const command of commands) {
            const parts = command.split(',').map(part => part.trim());
            const action = parts[0].toLowerCase();

            if (action === 'focus') {
                const positions = this.storedCameraPositions.get(command);
                totalFrames += positions.length;
            } else if (action === 'wait') {
                const waitSeconds = parseFloat(parts[1]);
                totalFrames += Math.ceil(waitSeconds * fps);
            }
        }

        // Now render frames with progress tracking
        for (const command of commands) {
            if (this.abortController.signal.aborted) break;

            const parts = command.split(',').map(part => part.trim());
            const action = parts[0].toLowerCase();
            const commandName = parts.join('-').toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');

            if (action === 'focus') {
                const positions = this.storedCameraPositions.get(command);
                const timeout = this.composerEngine.parseTimeout(parts);
                
                // Calculate max frames based on timeout if it exists
                const maxFrames = timeout ? Math.ceil((timeout / 1000) * fps) : positions.length;
                const framesToRender = Math.min(positions.length, maxFrames);
                
                for (let i = 0; i < framesToRender; i++) {
                    // Update camera position
                    map.jumpTo(positions[i]);
                    this.waitForMapRender(map);
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Only handle highlights if we have any active ones
                    if (activeHighlightCommands.length > 0) {
                        await this.composerEngine.executeCommand('remove, all');
                        for (const cmd of activeHighlightCommands) {
                            const highlightParts = cmd.split(',').map(part => part.trim());
                            highlightParts[4] = currentFrame.toString();
                            await this.composerEngine.executeCommand(highlightParts.join(', '));
                        }
                    }

                    // Capture frame
                    await this.captureFrame(
                        `frame_${currentFrame.toString().padStart(5, '0')}`,
                        this.renderTimestamp,
                        commandName,
                        currentFrame
                    );
                    
                    // Update progress
                    renderedFrames++;
                    this.updateProgress(renderedFrames, totalFrames, 'Rendering Frames...');
                    currentFrame++;
                }
            } else if (action === 'wait') {
                const waitSeconds = parseFloat(parts[1]);
                const waitFrames = Math.ceil(waitSeconds * fps);
                
                for (let i = 0; i < waitFrames; i++) {
                    if (activeHighlightCommands.length > 0) {
                        await this.composerEngine.executeCommand('remove, all');
                        for (const cmd of activeHighlightCommands) {
                            const highlightParts = cmd.split(',').map(part => part.trim());
                            highlightParts[4] = currentFrame.toString();
                            await this.composerEngine.executeCommand(highlightParts.join(', '));
                        }
                    }
                    
                    await this.captureFrame(
                        `frame_${currentFrame.toString().padStart(5, '0')}`,
                        this.renderTimestamp,
                        commandName,
                        currentFrame
                    );
                    
                    // Update progress
                    renderedFrames++;
                    this.updateProgress(renderedFrames, totalFrames, 'Rendering Frames...');
                    currentFrame++;
                }
            } else if (action === 'highlight') {
                activeHighlightCommands.push(command);
                await this.composerEngine.executeCommand(command);
            } else if (action === 'remove') {
                const option = parts[1].toLowerCase().trim();
                
                // Execute the remove command
                await this.composerEngine.executeCommand(command);
                
                // Update our active highlights stack
                if (option === 'last') {
                    activeHighlightCommands.pop();
                } else if (option === 'all') {
                    activeHighlightCommands.length = 0;
                }
            }
        }
    }

    async updateMapAndCapture(map, position, frameNum, highlightCommands, commandName) {
        // Update camera position if provided
        if (position) {
            map.jumpTo(position);
            await this.waitForMapRender(map);
        }

        // Update highlights
        await this.composerEngine.executeCommand('remove, all');
        for (const cmd of highlightCommands) {
            const parts = cmd.split(',').map(part => part.trim());
            parts[4] = frameNum.toString(); // Set frame number as 5th parameter
            await this.composerEngine.executeCommand(parts.join(', '));
        }

        // Capture frame
        await this.captureFrame(
            `frame_${frameNum.toString().padStart(5, '0')}`,
            this.renderTimestamp,
            commandName,
            frameNum
        );
        
        this.updateProgress(frameNum, this.getTotalFrames(), 'Rendering Frames...');
    }

    getTotalFrames() {
        // Calculate total frames based on stored positions and wait commands
        // Implementation depends on how you want to track total frames
        return 100; // Placeholder
    }

    async captureFrame(filename, timestamp, commandName, commandIndex) {
        // Remove nested folder structure, save directly to timestamp folder
        const timestampFolder = `${timestamp}`;
        const savePath = `/static/data/frames/${timestampFolder}/${filename}.png`;

        try {
            // Wait for map to finish rendering with timeout
            await Promise.race([
                new Promise(resolve => {
                    const checkRender = () => {
                        if (this.composerEngine.map.isStyleLoaded() && !this.composerEngine.map.isMoving()) {
                            this.composerEngine.map.once('render', () => {
                                setTimeout(resolve, 500);
                            });
                            this.composerEngine.map.triggerRepaint();
                        } else {
                            setTimeout(checkRender, 100);
                        }
                    };
                    checkRender();
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Render timeout')), 10000))
            ]);

            const canvas = this.composerEngine.map.getCanvas();
            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(blob => blob ? resolve(blob) : reject(), 'image/png', 1.0);
            });

            const formData = new FormData();
            formData.append('image', blob, 'map.png');
            formData.append('path', savePath);
            formData.append('timestamp_folder', timestampFolder);

            const response = await Promise.race([
                fetch('/save-canvas-frame', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': this.composerEngine.getCSRFToken()
                    },
                    body: formData
                }),
                new Promise((_, reject) => setTimeout(() => reject(), 30000))
            ]);

            if (!response.ok) {
                throw new Error('Failed to save capture');
            }

            return await response.json();

        } catch (error) {
            throw new Error(`Failed to capture frame: ${error.message}`);
        }
    }

    parseDuration(durationStr) {
        if (!durationStr) return 3000; // Default 3 seconds
        
        // Remove any whitespace and convert to lowercase
        durationStr = durationStr.trim().toLowerCase();
        
        // If it's just a number, assume seconds
        if (!isNaN(durationStr)) {
            return parseFloat(durationStr) * 1000;
        }
        
        // Parse time units
        const units = {
            'ms': 1,
            'milliseconds': 1,
            's': 1000,
            'seconds': 1000,
            'm': 60000,
            'minutes': 60000
        };
        
        for (const [unit, multiplier] of Object.entries(units)) {
            if (durationStr.endsWith(unit)) {
                const value = parseFloat(durationStr.replace(unit, ''));
                if (!isNaN(value)) {
                    return value * multiplier;
                }
            }
        }
        
        // If no valid format is found, return default
        return 3000;
    }
}