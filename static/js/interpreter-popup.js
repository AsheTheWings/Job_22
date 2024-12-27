import { ComposerEngine } from './composer-engine.js';
import { Renderer } from './render.js';

export class InterpreterPopup {
    constructor(ComposerEngine) {
        this.ComposerEngine = ComposerEngine;
        this.createPopupElements();
        this.addOutsideClickHandler();
    }

    createPopupElements() {
        // Create popup container
        this.popup = document.createElement('div');
        this.popup.className = 'interpreter-popup';
        this.popup.style.display = 'none';

        // Create content container
        this.content = document.createElement('div');
        this.content.className = 'interpreter-content';

        // Create log container
        this.logContainer = document.createElement('div');
        this.logContainer.className = 'interpreter-log';

        // Create buttons container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'interpreter-buttons';

        // Create Load button
        const loadButton = document.createElement('button');
        loadButton.className = 'interpreter-button load-button';
        loadButton.textContent = 'Load';

        // Create file input (hidden)
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.csv';  // Only accept CSV files
        this.fileInput.style.display = 'none';
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Create Run button
        this.runButton = document.createElement('button');
        this.runButton.className = 'interpreter-button run-button';
        this.runButton.textContent = 'Run';
        this.runButton.disabled = true;

        // Create Render button (keep UI but disable functionality)
        this.renderButton = document.createElement('button');
        this.renderButton.className = 'interpreter-button render-button';
        this.renderButton.textContent = 'Render';
        this.renderButton.disabled = false;  // Enable render button
        this.renderButton.title = 'Render animation frames';

        // Create Close button
        const closeButton = document.createElement('button');
        closeButton.className = 'interpreter-button close-button';
        closeButton.textContent = 'Close';

        // Add event listeners
        closeButton.addEventListener('click', () => this.hide());
        this.runButton.addEventListener('click', () => this.runCommands());
        loadButton.addEventListener('click', () => this.fileInput.click());
        this.renderButton.addEventListener('click', () => this.renderAnimation());

        // Assemble popup with new button order
        buttonContainer.appendChild(closeButton);      // 1. Close
        buttonContainer.appendChild(loadButton);       // 2. Load
        buttonContainer.appendChild(this.renderButton);// 3. Render
        buttonContainer.appendChild(this.runButton);   // 4. Run
        
        this.content.appendChild(this.logContainer);
        this.content.appendChild(buttonContainer);
        this.popup.appendChild(this.content);
        this.popup.appendChild(this.fileInput);

        // Add to main content
        const mainContent = document.querySelector('.main-content');
        mainContent.appendChild(this.popup);

        // Add click handler to the content to prevent event propagation
        this.content.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Add keydown event listener when popup is shown
        this.popup.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!this.runButton.disabled) {
                    this.runCommands();
                } else {
                    this.hide();
                }
            } else if (e.key === 'Escape') {
                this.hide();
            }
        });

        // Make popup focusable
        this.popup.setAttribute('tabindex', '-1');
    }

    addOutsideClickHandler() {
        // Add click handler to the popup container
        this.popup.addEventListener('click', (e) => {
            if (e.target === this.popup) {
                this.hide();
            }
        });
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            
            // Parse CSV content
            const lines = text.split('\n').map(line => 
                line.split(',').map(cell => 
                    cell.trim().replace(/^["']|["']$/g, '') // Remove quotes
                )
            );

            // First line should be name
            if (lines[0][0] !== 'name' || lines[0].length < 2) {
                throw new Error('Invalid project file format: missing name');
            }

            const projectName = lines[0][1];
            
            // Get commands (skip first line which is the name)
            const commands = lines.slice(1)
                .filter(line => line[0] === 'command')
                .map(line => line.slice(1).join(', ')); // Rejoin command parts with commas

            // Convert project data back to command string
            const commandString = commands.join('\n');

            // Update the composer textarea
            const composerInput = document.querySelector('.composer-input');
            if (composerInput) {
                composerInput.value = commandString;
            }

            this.addLogMessage(`Project "${projectName}" loaded successfully`, 'success');
            await this.interpret(commandString);
        } catch (error) {
            this.addLogMessage(`Error loading project: ${error.message}`, 'error');
        }
    }

    async handleFileContent(content, filepath) {
        try {
            // Parse CSV content
            const lines = content.split('\n').map(line => 
                line.split(',').map(cell => 
                    cell.trim().replace(/^["']|["']$/g, '') // Remove quotes
                )
            );

            // First line should be name
            if (lines[0][0] !== 'name' || lines[0].length < 2) {
                throw new Error('Invalid project file format: missing name');
            }

            const projectName = lines[0][1];
            
            // Get commands (skip first line which is the name)
            const commands = lines.slice(1)
                .filter(line => line[0] === 'command')
                .map(line => line.slice(1).join(', ')); // Rejoin command parts with commas

            // Convert project data back to command string
            const commandString = commands.join('\n');

            // Update the composer textarea
            const composerInput = document.querySelector('.composer-input');
            if (composerInput) {
                composerInput.value = commandString;
            }

            this.addLogMessage(`Project "${projectName}" loaded successfully`, 'success');
            await this.interpret(commandString);
        } catch (error) {
            this.addLogMessage(`Error loading project: ${error.message}`, 'error');
        }
    }

    async interpret(commandString) {
        this.currentCommands = commandString;
        this.logContainer.innerHTML = '';
        this.runButton.disabled = true;
        let isValid = true;

        // Check for empty input
        if (!commandString.trim()) {
            this.addLogMessage('No commands to interpret. Please enter some commands.', 'error');
            this.show();
            return;
        }

        try {
            const commands = commandString.split('\n').filter(cmd => cmd.trim() !== '');
            
            for (const command of commands) {
                const result = await this.validateCommand(command.trim());
                this.addLogMessage(result.message, result.type);
                if (result.type === 'error') {
                    isValid = false;
                }
            }

            if (isValid) {
                this.addLogMessage('All commands are valid and ready to run', 'success');
                this.runButton.disabled = false;
            }
        } catch (error) {
            this.addLogMessage(error.message, 'error');
            isValid = false;
        }

        this.show();
    }

    async validateCommand(command) {
        const parts = command.split(',').map(part => part.trim());
        const action = parts[0].toLowerCase();

        switch (action) {
            case 'highlight':
                return this.validateHighlight(parts);
            case 'animate':
                return this.validateAnimate(parts);
            case 'focus':
                return this.validateFocus(parts);
            case 'project':
                return this.validateProject(parts);
            case 'sequence':
                return this.validateSequence(parts);
            case 'wait':
                return this.validateWait(parts);
            case 'remove':
                return this.validateRemove(parts);
            case 'highlight2':
                return this.validateHighlight2(parts);
            case 'reset':
                return this.validateReset(parts);
            case 'trans':
                return this.validateTrans(parts);
            case 'set':
                return this.validateSet(parts);
            default:
                return {
                    type: 'error',
                    message: `Unknown command: ${action}`
                };
        }
    }

    async validateHighlight(parts) {
        if (parts.length !== 4 && parts.length !== 5) {
            return {
                type: 'error',
                message: `Highlight command requires 4 or 5 parameters, got ${parts.length}`
            };
        }

        const dataFile = parts[1].replace(/["']/g, '').trim().replace(/\.js$/, '');
        const regionSelector = parts[2].replace(/["']/g, '').trim();
        const styleOption = parts[3].replace(/["']/g, '').trim();
        const frameNumber = parts.length === 5 ? parts[4].trim() : null;

        try {
            // Try to load the JSON file directly
            const response = await fetch(`/static/data/${dataFile}.json`);
            if (!response.ok) {
                return {
                    type: 'error',
                    message: `Data file "${dataFile}.json" not found`
                };
            }

            // Validate style option
            if (styleOption !== 'unique') {
                const stylePreset = this.ComposerEngine.stylePresets.find(s => s.id === styleOption);
                if (!stylePreset && !CSS.supports('color', styleOption)) {
                    return {
                        type: 'error',
                        message: `Invalid style option: ${styleOption}. Must be 'unique', a valid color, or a style preset ID (${this.ComposerEngine.stylePresets.map(s => s.id).join(', ')})`
                    };
                }
            }

            // Validate frame number if provided
            if (frameNumber !== null) {
                const frame = parseInt(frameNumber);
                if (isNaN(frame) || frame < 0) {
                    return {
                        type: 'error',
                        message: `Invalid frame number: ${frameNumber}. Must be a positive integer`
                    };
                }
            }

        } catch (error) {
            return {
                type: 'error',
                message: `Error accessing GeoJSON file: ${error.message}`
            };
        }

        return {
            type: 'success',
            message: `✓ Highlight command validated: ${dataFile} - ${regionSelector} with style ${styleOption}${frameNumber ? ` at frame ${frameNumber}` : ''}`
        };
    }

    validateProject(parts) {
        if (parts.length < 2) {
            return {
                type: 'error',
                message: 'Project command requires a name'
            };
        }

        // Store the current command string for saving
        const composerInput = document.querySelector('.composer-input');
        if (composerInput) {
            this.currentProjectData = {
                name: parts[1].replace(/["']/g, ''),
                commands: composerInput.value.split('\n').filter(cmd => cmd.trim() !== '')
            };
        }

        return {
            type: 'success',
            message: `✓ Project command validated: ${parts[1]}`
        };
    }

    validateSequence(parts) {
        if (parts.length < 2) {
            return {
                type: 'error',
                message: 'Sequence command requires a name'
            };
        }
        return {
            type: 'success',
            message: `✓ Sequence command validated: ${parts[1]}`
        };
    }

    async validateFocus(parts) {
        if (!parts[1] || !parts[1].trim()) {
            return {
                type: 'error',
                message: 'Focus command requires at least a preset ID or location'
            };
        }

        const firstParam = parts[1].trim();
        const preset = this.ComposerEngine.presets.find(p => p.id === firstParam);

        if (preset) {
            // Validate preset format
            if (!parts[2] || !parts[2].trim()) {
                return {
                    type: 'error',
                    message: 'When using preset, a location parameter is required'
                };
            }

            // Validate optional duration if provided
            if (parts[3]) {
                const durationStr = parts[3];
                if (!durationStr.match(/^\d*\.?\d+s$/)) {
                    return {
                        type: 'error',
                        message: `Invalid duration format: ${durationStr}. Expected format: "0.1s", "1.5s" or "10s"`
                    };
                }
            }
        } else {
            // Validate direct location format
            // Validate optional parameters if provided
            if (parts[2]) {
                const durationStr = parts[2];
                if (!durationStr.match(/^\d*\.?\d+s$/)) {
                    return {
                        type: 'error',
                        message: `Invalid duration format: ${durationStr}. Expected format: "0.1s", "1.5s" or "10s"`
                    };
                }
            }
            if (parts[3] && isNaN(parseFloat(parts[3]))) {
                return {
                    type: 'error',
                    message: 'Invalid zoom value'
                };
            }
            if (parts[4] && isNaN(parseFloat(parts[4]))) {
                return {
                    type: 'error',
                    message: 'Invalid pitch value'
                };
            }
            if (parts[5] && isNaN(parseFloat(parts[5]))) {
                return {
                    type: 'error',
                    message: 'Invalid bearing value'
                };
            }
            if (parts[6] && (isNaN(parseFloat(parts[6])) || parseFloat(parts[6]) < 0 || parseFloat(parts[6]) > 1)) {
                return {
                    type: 'error',
                    message: 'Invalid curve value (must be between 0 and 1)'
                };
            }
        }

        return {
            type: 'success',
            message: preset ? 
                `✓ Focus command validated: ${firstParam} preset with location ${parts[2]}` :
                `✓ Focus command validated: ${firstParam}`
        };
    }

    validateWait(parts) {
        if (parts.length !== 2) {
            return {
                type: 'error',
                message: 'Wait command requires exactly 1 parameter: duration in seconds'
            };
        }

        const durationStr = parts[1];
        if (!durationStr.match(/^\d+(\.\d+)?s$/)) {
            return {
                type: 'error',
                message: `Invalid duration format: ${durationStr}. Expected format: "1.5s" or "2s"`
            };
        }

        return {
            type: 'success',
            message: `✓ Wait command validated: ${durationStr}`
        };
    }

    validateRemove(parts) {
        if (parts.length !== 2) {
            return {
                type: 'error',
                message: 'Remove command requires exactly 2 parameters: remove, last/all'
            };
        }

        const option = parts[1].toLowerCase().trim();
        if (option !== 'last' && option !== 'all') {
            return {
                type: 'error',
                message: 'Remove command second parameter must be "last" or "all"'
            };
        }

        return {
            type: 'success',
            message: `✓ Remove command validated: ${option}`
        };
    }

    async validateHighlight2(parts) {
        if (parts.length !== 3) {
            return {
                type: 'error',
                message: 'Highlight2 command requires: highlight2, country_codes, color'
            };
        }

        const countryCodes = parts[1].replace(/["']/g, '').trim().split(' ');
        const colorOption = parts[2].replace(/["']/g, '').trim();

        // Validate country codes format (2 or 3 letter codes)
        const invalidCodes = countryCodes.filter(code => !code.match(/^[A-Z]{2,3}$/));
        if (invalidCodes.length > 0) {
            return {
                type: 'error',
                message: `Invalid country codes: ${invalidCodes.join(', ')}. Must be ISO 3166-1 alpha-2 or alpha-3 format (e.g., US/USA, FR/FRA)`
            };
        }

        // Check if color is 'unique' or validate color format
        if (colorOption.toLowerCase() !== 'unique') {
            const isValidColor = CSS.supports('color', colorOption);
            if (!isValidColor) {
                return {
                    type: 'error',
                    message: `Invalid color format: ${colorOption}`
                };
            }
        }

        return {
            type: 'success',
            message: `✓ Highlight2 command validated: ${countryCodes.join(', ')}`
        };
    }

    validateReset(parts) {
        if (parts.length !== 1) {
            return {
                type: 'error',
                message: 'Reset command takes no parameters'
            };
        }
        return {
            type: 'success',
            message: '✓ Reset command validated'
        };
    }

    validateTrans(parts) {
        if (parts.length !== 3) {
            return {
                type: 'error',
                message: 'Trans command requires: trans, offset, duration'
            };
        }

        // Validate offset format
        const offsetStr = parts[1].trim();
        const offsets = offsetStr.split(' ').map(Number);
        if (offsets.length !== 2 || offsets.some(isNaN)) {
            return {
                type: 'error',
                message: 'Invalid offset format. Expected: "lng lat" (e.g., "-10 0")'
            };
        }

        // Validate duration format
        const durationStr = parts[2];
        if (!durationStr.match(/^\d+s$/)) {
            return {
                type: 'error',
                message: `Invalid duration format: ${durationStr}. Expected format: "10s"`
            };
        }

        return {
            type: 'success',
            message: `✓ Trans command validated: offset ${offsetStr}`
        };
    }

    validateSet(parts) {
        if (parts.length < 3) {
            return {
                type: 'error',
                message: 'Set command requires at least 3 parameters: set, feature, value'
            };
        }

        const feature = parts[1].toLowerCase().trim();
        const value = parts[2].toLowerCase().trim();
        const target = parts[3] ? parts[3].toLowerCase().trim() : null;

        // Validate feature
        if (!['local borders', 'borders'].includes(feature)) {
            return {
                type: 'error',
                message: `Invalid feature: ${feature}. Supported features: 'local borders', 'borders'`
            };
        }

        // Validate value
        if (value !== 'off') {
            return {
                type: 'error',
                message: `Invalid value: ${value}. Only 'off' is currently supported`
            };
        }

        return {
            type: 'success',
            message: `✓ Set command validated: ${feature} ${value}${target ? ` for ${target}` : ''}`
        };
    }

    addLogMessage(message, type) {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = message;
        this.logContainer.appendChild(logEntry);
    }

    show() {
        this.popup.style.display = 'flex';
        // Focus the popup when shown to enable keyboard events
        this.popup.focus();
    }

    hide() {
        this.popup.style.display = 'none';
        this.logContainer.innerHTML = '';
    }

    async runCommands() {
        this.hide();  // Close the window immediately
        try {
            await this.ComposerEngine.executeCommands(this.currentCommands);
        } catch (error) {
            // Create a temporary error display since the interpreter is closed
            const errorToast = document.createElement('div');
            errorToast.className = 'error-toast';
            errorToast.textContent = `Error: ${error.message}`;
            document.body.appendChild(errorToast);
            
            // Remove the error toast after 3 seconds
            setTimeout(() => {
                errorToast.remove();
            }, 3000);
        }
    }

    // Add new method to handle file selection dialog
    showFileSelectionDialog(files) {
        const dialog = document.createElement('dialog');
        dialog.className = 'file-selection-dialog';
        
        const content = `
            <h3>Select a project file</h3>
            <select class="file-select">
                ${files.map(file => `
                    <option value="${file.path}">${file.name}</option>
                `).join('')}
            </select>
            <div class="dialog-buttons">
                <button class="load-btn">Load</button>
                <button class="cancel-btn">Cancel</button>
            </div>
        `;
        
        dialog.innerHTML = content;
        document.body.appendChild(dialog);
        
        const select = dialog.querySelector('.file-select');
        const loadBtn = dialog.querySelector('.load-btn');
        const cancelBtn = dialog.querySelector('.cancel-btn');
        
        loadBtn.addEventListener('click', () => {
            const selectedPath = select.value;
            fetch(selectedPath)
                .then(response => response.text())
                .then(text => {
                    this.handleFileContent(text, selectedPath);
                    dialog.close();
                })
                .catch(error => {
                    this.addLogMessage(`Error loading file: ${error.message}`, 'error');
                })
                .finally(() => {
                    dialog.remove();
                });
        });
        
        cancelBtn.addEventListener('click', () => {
            dialog.close();
            dialog.remove();
        });
        
        dialog.showModal();
    }

    // Add new method to handle rendering
    async renderAnimation() {
        const commands = this.currentCommands?.split('\n').filter(cmd => cmd.trim()) || [];
        if (commands.length === 0) {
            this.addLogMessage('No commands to render', 'error');
            return;
        }

        try {
            this.hide();
            const renderer = new Renderer(this.ComposerEngine);
            
            // Render all commands
            const result = await renderer.renderCommands(commands);
            
            if (result) {
                const successToast = document.createElement('div');
                successToast.className = 'capture-success';
                successToast.textContent = result.message;
                document.body.appendChild(successToast);
                setTimeout(() => successToast.remove(), 3000);
            }
        } catch (error) {
            if (error.message !== 'Rendering cancelled') {
                const errorToast = document.createElement('div');
                errorToast.className = 'error-toast';
                errorToast.textContent = `Render failed: ${error.message}`;
                document.body.appendChild(errorToast);
                setTimeout(() => errorToast.remove(), 3000);
            }
        }
    }

    // Update getCurrentCommand method
    getCurrentCommand() {
        // If there's only one command, use it
        const commands = this.currentCommands?.split('\n').filter(cmd => cmd.trim()) || [];
        if (commands.length === 1) {
            return commands[0].trim();
        }

        // Otherwise use selection
        const selection = window.getSelection();
        if (!selection.rangeCount) return null;
        
        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        
        // Find the closest command line
        let commandLine = node;
        while (commandLine && !commandLine.textContent.includes('\n')) {
            commandLine = commandLine.parentNode;
        }
        
        if (!commandLine) return null;
        
        // Extract the command text
        const text = commandLine.textContent;
        const lines = text.split('\n');
        const selectedLine = lines.find(line => 
            line.includes(range.toString()) || 
            range.toString().includes(line)
        );
        
        return selectedLine ? selectedLine.trim() : null;
    }
} 