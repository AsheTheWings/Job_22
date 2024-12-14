export class ManualPopup {
    constructor() {
        this.createPopupElements();
        this.addOutsideClickHandler();
    }

    createPopupElements() {
        // Create popup container
        this.popup = document.createElement('div');
        this.popup.className = 'manual-popup';
        this.popup.style.display = 'none';

        // Create content container
        this.content = document.createElement('div');
        this.content.className = 'manual-content';

        // Create header
        const header = document.createElement('h2');
        header.textContent = 'Command Manual';
        header.className = 'manual-header';

        // Create table
        const table = document.createElement('table');
        table.className = 'manual-table';

        // Add table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Command</th>
                <th>Syntax</th>
                <th>Description</th>
            </tr>
        `;
        table.appendChild(thead);

        // Add table body with commands
        const tbody = document.createElement('tbody');
        tbody.innerHTML = `
            <tr>
                <td>project</td>
                <td>project, name</td>
                <td>Creates or loads a project with the specified name</td>
            </tr>
            <tr>
                <td>highlight</td>
                <td>highlight, data_file, region/all, color/unique</td>
                <td>Highlights regions on the map using specified data file and color</td>
            </tr>
            <tr>
                <td>highlight2</td>
                <td>highlight2, country_codes, color/unique</td>
                <td>
                    Highlights countries using Mapbox's built-in boundaries. Country codes can be either ISO 3166-1 alpha-2 
                    (e.g., <code>US FR DE</code>) or alpha-3 format (e.g., <code>USA FRA DEU</code>) separated by spaces. 
                    Color can be hex (<code>#ff0000</code>), rgb(<code>255,0,0</code>), named color (<code>red</code>), 
                    or '<code>unique</code>' for automatic distinct colors.
                    <br><br>
                    Examples:<br>
                    <code>highlight2, US CA MX, #ff0000</code><br>
                    <code>highlight2, USA CAN MEX, unique</code><br>
                    <code>highlight2, FR DEU IT, #00ff00</code>
                </td>
            </tr>
            <tr>
                <td>focus</td>
                <td>
                    focus, location [, duration, zoom, pitch, bearing, curve]<br>
                    - or -<br>
                    focus, preset_id, location [, duration]
                </td>
                <td>
                    Animates the map view using either direct parameters or a preset animation.<br><br>
                    Direct parameters:<br>
                    location: coordinates or location name (required)<br>
                    duration: animation duration (default: 3s)<br>
                    zoom: zoom level (default: 12)<br>
                    pitch: tilt angle (default: 0°)<br>
                    bearing: rotation (default: 0°)<br>
                    curve: animation curve (default: 1)<br><br>
                    Preset format:<br>
                    preset_id: animation preset identifier (e.g., "z1")<br>
                    location: coordinates or location name (required)<br>
                    duration: animation duration (optional, default: 3s)
                </td>
            </tr>
            <tr>
                <td>sequence</td>
                <td>sequence, name</td>
                <td>Groups a series of commands into a named sequence</td>
            </tr>
            <tr>
                <td>wait</td>
                <td>wait, duration</td>
                <td>Pauses execution for specified duration</td>
            </tr>
            <tr>
                <td>remove</td>
                <td>remove, last/all</td>
                <td>Removes the last highlight or all highlights from the map</td>
            </tr>
            <tr>
                <td>reset</td>
                <td>reset</td>
                <td>Removes all highlights and resets the map view to default position</td>
            </tr>
            <tr>
                <td>trans</td>
                <td>trans, offset, duration</td>
                <td>
                    Makes a relative camera transition from current position.<br><br>
                    offset: "longitude latitude" offsets (e.g., "-10 0")<br>
                    duration: animation duration (e.g., "3s")<br><br>
                    Example: "trans, -10 0, 3s" moves camera 10 degrees west
                </td>
            </tr>
        `;
        table.appendChild(tbody);

        // Create table container
        const tableContainer = document.createElement('div');
        tableContainer.className = 'manual-table-container';
        tableContainer.appendChild(table);

        // Create close button
        const closeButton = document.createElement('button');
        closeButton.className = 'manual-button close-button';
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', () => this.hide());

        // Assemble popup
        this.content.appendChild(header);
        this.content.appendChild(tableContainer);
        this.content.appendChild(closeButton);
        this.popup.appendChild(this.content);

        // Add to main content
        const mainContent = document.querySelector('.main-content');
        mainContent.appendChild(this.popup);

        // Add click handler to the content to prevent event propagation
        this.content.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    addOutsideClickHandler() {
        // Add click handler to the popup container
        this.popup.addEventListener('click', (e) => {
            if (e.target === this.popup) {
                this.hide();
            }
        });
    }

    show() {
        this.popup.style.display = 'flex';
    }

    hide() {
        this.popup.style.display = 'none';
    }
} 