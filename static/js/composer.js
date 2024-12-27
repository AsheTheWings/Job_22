import { ManualPopup } from './manual-popup.js';
import { InterpreterPopup } from './interpreter-popup.js';
import { ComposerEngine } from './composer-engine.js';

export class Composer {
    constructor(map, sidebar) {
        this.map = map;
        this.sidebar = sidebar;
        this.composerContainer = null;
        this.textInput = null;
        this.focusPopup = null;
        this.originalPosition = null;
        this.ComposerEngine = new ComposerEngine(map);
        this.interpreterPopup = new InterpreterPopup(this.ComposerEngine);
        
        this.createComposerInterface();
        this.setupEventListeners();
        this.addCommandBullets();
    }

    createComposerInterface() {
        // Create container for composer interface
        this.composerContainer = document.createElement('div');
        this.composerContainer.className = 'composer-container';
        this.composerContainer.style.display = 'none';

        // Create text input
        this.textInput = document.createElement('textarea');
        this.textInput.className = 'composer-input';
        
        // Create buttons container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'composer-buttons';
        
        // Create Close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.className = 'composer-button cancel-button';
        
        // Create Interpret button
        const interpretButton = document.createElement('button');
        interpretButton.className = 'composer-button run-button';
        interpretButton.textContent = 'Interpret';

        // Create Manual button
        const manualButton = document.createElement('button');
        manualButton.className = 'composer-button manual-button';
        manualButton.textContent = 'Manual';

        // Add buttons to container
        buttonContainer.appendChild(closeButton);
        buttonContainer.appendChild(manualButton);
        buttonContainer.appendChild(interpretButton);
        
        // Create manual popup instance
        const manualPopup = new ManualPopup();

        // Button click handlers
        manualButton.addEventListener('click', () => {
            manualPopup.show();
        });

        closeButton.addEventListener('click', async () => {
            this.hide();
            await this.sidebar.reinitializeMap();
            this.ComposerEngine = new ComposerEngine(this.sidebar.map);
            this.interpreterPopup = new InterpreterPopup(this.ComposerEngine);
        });

        interpretButton.addEventListener('click', async () => {
            try {
                await this.interpreterPopup.interpret(this.textInput.value);
            } catch (error) {
                console.error('Error interpreting commands:', error);
            }
        });

        // Add elements to composer container
        this.composerContainer.appendChild(this.textInput);
        this.composerContainer.appendChild(buttonContainer);
    }

    show() {
        // Hide all existing sidebar elements
        Array.from(this.sidebar.sidebar.children).forEach(element => {
            element.style.display = 'none';
        });
        
        // Show composer container
        this.composerContainer.style.display = 'flex';
        this.sidebar.sidebar.appendChild(this.composerContainer);
    }

    hide() {
        // Show all original sidebar elements
        Array.from(this.sidebar.sidebar.children).forEach(element => {
            if (element !== this.composerContainer) {
                element.style.display = '';
            }
        });
        this.composerContainer.style.display = 'none';
    }

    setupEventListeners() {
        this.textInput.addEventListener('input', () => {
            this.handleInput();
            this.addCommandBullets();
        });
        
        this.textInput.addEventListener('scroll', () => {
            this.addCommandBullets();
        });

        this.textInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    return;
                }
                
                e.preventDefault();
                if (this.focusPopup) {
                    const applyButton = this.focusPopup.querySelector('.apply-button');
                    if (applyButton) {
                        applyButton.click();
                    }
                    return;
                }
                try {
                    await this.interpreterPopup.interpret(this.textInput.value);
                } catch (error) {
                    console.error('Error interpreting commands:', error);
                }
            } else if (e.key === 'Tab') {
                e.preventDefault(); // Prevent default tab behavior
                
                const cursorPosition = this.textInput.selectionStart;
                const text = this.textInput.value;
                const beforeCursor = text.substring(0, cursorPosition);
                const afterCursor = text.substring(cursorPosition);
                
                // Find the current line's start and end
                const lastNewLine = beforeCursor.lastIndexOf('\n');
                const currentLineStart = lastNewLine === -1 ? 0 : lastNewLine + 1;
                const nextNewLine = text.indexOf('\n', cursorPosition);
                const currentLineEnd = nextNewLine === -1 ? text.length : nextNewLine;
                
                // Insert new line after the current line
                const newText = text.substring(0, currentLineEnd) + '\n' + 
                               text.substring(currentLineEnd);
                               
                this.textInput.value = newText;
                
                // Place cursor at the start of the new line
                const newCursorPosition = currentLineEnd + 1;
                this.textInput.setSelectionRange(newCursorPosition, newCursorPosition);
                
                // Trigger input event to update bullets
                this.handleInput();
                this.addCommandBullets();
            }
        });

        document.addEventListener('click', (e) => {
            if (this.focusPopup && 
                !this.focusPopup.contains(e.target) && 
                !this.textInput.contains(e.target) &&
                !e.target.classList.contains('command-bullet')) {
                this.cancelFocusPopup();
            }
        });
    }

    handleInput() {
        const text = this.textInput.value;
        const cursorPosition = this.textInput.selectionStart;
        const currentLine = text.substr(0, cursorPosition).split('\n').length - 1;
        const lines = text.split('\n');
        const currentLineText = lines[currentLine];

        this.textInput.blur();
        this.textInput.focus();

        if (this.focusPopup) {
            this.focusPopup.remove();
            this.focusPopup = null;
        }
    }

    addCommandBullets() {
        const existingBullets = this.composerContainer.querySelectorAll('.command-bullet');
        existingBullets.forEach(bullet => bullet.remove());

        const lines = this.textInput.value.split('\n');
        const textPosition = this.textInput.getBoundingClientRect();
        const lineHeight = parseInt(window.getComputedStyle(this.textInput).lineHeight);

        lines.forEach((line, index) => {
            const command = line.trim().split(',')[0].toLowerCase();
            if (command === 'focus') {
                const bullet = document.createElement('div');
                bullet.className = 'command-bullet focus-bullet';
                
                const composerRect = this.composerContainer.getBoundingClientRect();
                bullet.style.top = `${textPosition.top - composerRect.top + (index * lineHeight) + 18}px`;
                bullet.style.left = `${textPosition.left - composerRect.left - 24}px`;

                bullet.title = "Click to configure focus animation";

                bullet.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    const lines = this.textInput.value.split('\n');
                    const previousLines = lines.slice(0, index).join('\n');
                    const cursorPosition = previousLines.length + (previousLines ? 1 : 0);
                    this.textInput.setSelectionRange(cursorPosition, cursorPosition + lines[index].length);
                    
                    const position = {
                        x: textPosition.left + 25,
                        y: textPosition.top + (index * lineHeight) + 25
                    };
                    
                    this.createFocusPopup(position);
                });

                this.composerContainer.appendChild(bullet);
            }
        });
    }

    createFocusPopup(position) {
        if (this.focusPopup) {
            this.focusPopup.remove();
        }

        this.originalPosition = {
            center: this.map.getCenter(),
            zoom: this.map.getZoom(),
            pitch: this.map.getPitch(),
            bearing: this.map.getBearing()
        };

        this.focusPopup = document.createElement('div');
        this.focusPopup.className = 'focus-popup';
        this.focusPopup.style.left = `${position.x}px`;
        this.focusPopup.style.top = `${position.y}px`;
        
        this.focusPopup.setAttribute('tabindex', '-1');

        this.focusPopup.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const applyButton = this.focusPopup.querySelector('.apply-button');
                if (applyButton) {
                    applyButton.click();
                }
            } else if (e.key === 'Escape') {
                this.cancelFocusPopup();
            }
        });

        const ranges = [
            { name: 'duration', min: 1, max: 10, default: 3, step: 0.5, unit: 's' },
            { name: 'zoom', min: 1, max: 20, default: this.map.getZoom(), step: 0.5, unit: '' },
            { name: 'pitch', min: 0, max: 60, default: this.map.getPitch(), step: 5, unit: '°' },
            { name: 'bearing', min: -180, max: 180, default: this.map.getBearing(), step: 5, unit: '°' },
            { name: 'curve', min: 0.1, max: 1, default: 1, step: 0.1, unit: '' }
        ];

        let values = {};
        ranges.forEach(range => {
            if (range.name !== 'duration' && range.name !== 'curve') {
                range.default = Math.round(range.default / range.step) * range.step;
            }
            values[range.name] = range.default;
            this.createRangeControl(range, values);
        });

        const applyButton = document.createElement('button');
        applyButton.className = 'apply-button';
        applyButton.textContent = 'Apply';
        applyButton.addEventListener('click', () => {
            const cursorPosition = this.textInput.selectionStart;
            const text = this.textInput.value;
            const lines = text.split('\n');
            const currentLine = text.substr(0, cursorPosition).split('\n').length - 1;
            
            const center = this.map.getCenter();
            const coords = `${center.lng.toFixed(6)} ${center.lat.toFixed(6)}`;
            
            lines[currentLine] = `focus, ${coords}, ${values.duration}s, ${values.zoom}, ${values.pitch}, ${values.bearing}, ${values.curve}`;
            
            this.textInput.value = lines.join('\n');
            
            this.focusPopup.remove();
            this.focusPopup = null;
            this.originalPosition = null;
        });

        this.focusPopup.appendChild(applyButton);
        this.composerContainer.appendChild(this.focusPopup);
        
        this.focusPopup.focus();
    }

    createRangeControl(range, values) {
        const container = document.createElement('div');
        container.className = 'range-container';

        const label = document.createElement('label');
        label.textContent = range.name.charAt(0).toUpperCase() + range.name.slice(1);
        
        const rangeRow = document.createElement('div');
        rangeRow.className = 'range-row';

        const input = document.createElement('input');
        input.type = 'range';
        input.min = range.min;
        input.max = range.max;
        input.step = range.step;
        input.value = range.default;

        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'value-display';
        valueDisplay.textContent = `${range.default}${range.unit}`;

        input.addEventListener('input', () => {
            const value = parseFloat(input.value);
            valueDisplay.textContent = `${value}${range.unit}`;
            values[range.name] = value;

            if (range.name !== 'duration') {
                this.map.easeTo({
                    center: this.map.getCenter(),
                    [range.name]: value,
                    duration: 0
                });
            }
        });

        rangeRow.appendChild(input);
        rangeRow.appendChild(valueDisplay);
        container.appendChild(label);
        container.appendChild(rangeRow);
        this.focusPopup.appendChild(container);
    }

    cancelFocusPopup() {
        if (this.originalPosition) {
            this.map.easeTo({
                ...this.originalPosition,
                duration: 0
            });
        }
        if (this.focusPopup) {
            this.focusPopup.remove();
            this.focusPopup = null;
        }
        this.originalPosition = null;
    }
} 