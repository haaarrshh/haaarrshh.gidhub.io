// --- CONFIGURATION ---
// Set the initial map center and zoom level
const mapCenter = [22.5, 82.5];
const mapZoom = 5;

// --- INITIALIZE MAP ---
// Create the Leaflet map object
const map = L.map('map').setView(mapCenter, mapZoom);

// Add a base tile layer (the visual map background)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);

// --- GLOBAL VARIABLES ---
let geojsonLayer;
let infoTooltip;
let currentView = 'costOfLiving'; // This will be our default view

// --- DATA FETCHING AND MAP CREATION ---
// Use Promise.all to fetch both datasets at the same time
Promise.all([
    fetch('india-states.geojson'),
    fetch('data.json') 
]).then(responses => Promise.all(responses.map(res => res.json())))
  .then(([geojsonData, demographicData]) => {
    
    // Merge the demographic data into the GeoJSON properties
    geojsonData.features.forEach(feature => {
        const stateName = feature.properties.st_nm;
        const stateData = demographicData.find(d => d.name === stateName);
        if (stateData) {
            feature.properties.demographics = stateData;
        }
    });

    // Create the GeoJSON layer
    geojsonLayer = L.geoJson(geojsonData, {
        style: styleLayer,
        onEachFeature: onEachFeature
    }).addTo(map);

    // Create and add the info tooltip control
    createInfoTooltip();

}).catch(error => console.error('Error loading data:', error));


// --- STYLING AND INTERACTIVITY FUNCTIONS ---

// Function to determine the color of a state based on the current view
function getColor(value) {
    const scale = {
        'Low': '#74c476',
        'Low to Moderate': '#a1d99b',
        'Moderate': '#fed976',
        'High': '#feb24c',
        'Very High': '#f03b20',
        'Default': '#bd0026' // For safety, where values are different
    };
    
    // Simplified mapping for safety
    if(currentView === 'safety') {
        if (value.includes('Very High') || value.includes('High')) return scale['Low'];
        if (value.includes('Moderate')) return scale['Moderate'];
        return scale['Very High']; // Low safety = high danger color
    }
    
    return scale[value] || '#cccccc'; // Return grey if no match
}

// Function that defines the style for each state layer
function styleLayer(feature) {
    const demographics = feature.properties.demographics;
    let value = demographics ? demographics[currentView] : null;
    
    return {
        fillColor: getColor(value),
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.8
    };
}

// Function to handle events for each state feature
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
    });
}

// Event handler for mouseover
function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({
        weight: 3,
        color: '#333',
        fillOpacity: 0.9
    });
    layer.bringToFront();
    updateInfoTooltip(layer.feature.properties);
}

// Event handler for mouseout
function resetHighlight(e) {
    geojsonLayer.resetStyle(e.target);
    infoTooltip.update(); // Clear the tooltip
}

// --- INFO TOOLTIP CONTROL ---
function createInfoTooltip() {
    infoTooltip = L.control(); // Create a new Leaflet control

    infoTooltip.onAdd = function(map) {
        this._div = L.DomUtil.create('div', 'info-tooltip'); // Create a div with a class "info"
        this.update();
        return this._div;
    };

    // Method that we will use to update the control based on feature properties passed
    infoTooltip.update = function(props) {
        const data = props && props.demographics ? props.demographics : null;
        let content = '<h4>India Demographics</h4>';
        if (data) {
            content += `<b>${data.name}</b><br/>`;
            content += `Cost of Living: ${data.costOfLiving}<br/>`;
            content += `Safety: ${data.safety}<br/>`;
            // We'll add pollution dynamically later
        } else {
            content += 'Hover over a state';
        }
        this._div.innerHTML = content;
    };

    infoTooltip.addTo(map);
}

function updateInfoTooltip(props) {
    infoTooltip.update(props);
}


// --- UI EVENT LISTENERS ---
function setupUI() {
    const buttons = document.querySelectorAll('.controls button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active button style
            buttons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update the current view
            if(button.id === 'costBtn') currentView = 'costOfLiving';
            if(button.id === 'safetyBtn') currentView = 'safety';
            if(button.id === 'pollutionBtn') currentView = 'pollution'; // You would need to add pollution data

            // Redraw the map with the new styles
            geojsonLayer.setStyle(styleLayer);
        });
    });
}

// Initialize the UI controls
setupUI();
