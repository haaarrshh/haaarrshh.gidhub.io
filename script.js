// --- CONFIGURATION ---
const mapCenter = [22.5, 82.5];
const mapZoom = 5;

// --- INITIALIZE MAP (WITH INTERACTION DISABLED) ---
const map = L.map('map', {
    center: mapCenter,
    zoom: mapZoom,
    dragging: false,
    zoomControl: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    touchZoom: false
});

// --- GLOBAL VARIABLES ---
let geojsonLayer;
let selectedLayer = null; // To keep track of the clicked state

// --- DATA FETCHING AND MAP CREATION ---
Promise.all([
    fetch('india-states.geojson'),
    fetch('data.json') 
]).then(responses => Promise.all(responses.map(res => res.json())))
  .then(([geojsonData, demographicData]) => {
    
    geojsonData.features.forEach(feature => {
        const stateName = feature.properties.st_nm;
        const stateData = demographicData.find(d => d.name === stateName);
        if (stateData) {
            feature.properties.demographics = stateData;
        }
    });

    geojsonLayer = L.geoJson(geojsonData, {
        style: styleLayer,
        onEachFeature: onEachFeature
    }).addTo(map);

}).catch(error => console.error('Error loading data:', error));


// --- STYLING AND INTERACTIVITY FUNCTIONS ---

// Function to determine the color of a state (remains the same)
function getColor(feature) {
    // ... (Keep your existing getColor, getCostColor, getSafetyColor functions)
    const demographics = feature.properties.demographics;
    if (!demographics) return '#cccccc';
    // Simplified example, use your detailed function from the previous step
    return demographics.costOfLiving === 'High' ? '#d62728' : '#2ca02c'; 
}

// Default style for states
function styleLayer(feature) {
    return {
        fillColor: getColor(feature),
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.8
    };
}

// Style for the selected state
const selectedStyle = {
    weight: 3,
    color: '#333',
    fillOpacity: 0.9
};

// Function to handle events for each state feature
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: selectState
    });
}

// Mouseover handler (for hover effect)
function highlightFeature(e) {
    const layer = e.target;
    if (layer !== selectedLayer) {
        layer.setStyle(selectedStyle);
        layer.bringToFront();
    }
}

// Mouseout handler (resets hover effect)
function resetHighlight(e) {
    if (e.target !== selectedLayer) {
        geojsonLayer.resetStyle(e.target);
    }
}

// Click handler (selects the state and updates the sidebar)
function selectState(e) {
    // Reset style of the previously selected layer
    if (selectedLayer) {
        geojsonLayer.resetStyle(selectedLayer);
    }

    const layer = e.target;
    selectedLayer = layer; // Update the selected layer
    layer.setStyle(selectedStyle);
    layer.bringToFront();

    // Populate the sidebar with details
    displayStateDetails(layer.feature.properties);
}

// --- SIDEBAR UPDATE FUNCTION ---
function displayStateDetails(properties) {
    const detailsContainer = document.getElementById('details-content');
    const initialText = document.querySelector('.initial-text');
    const demographics = properties.demographics;

    // Hide the initial "Click a state" message
    if (initialText) {
        initialText.style.display = 'none';
    }

    if (demographics) {
        detailsContainer.innerHTML = `
            <h3>${demographics.name}</h3>
            <p><strong>Type:</strong> ${demographics.type}</p>
            <p><strong>Cost of Living:</strong> ${demographics.costOfLiving}</p>
            <p><strong>Safety:</strong> ${demographics.safety}</p>
            <p><strong>Human Rights:</strong> ${demographics.humanRights}</p>
            <p><strong>Live Pollution:</strong> ${demographics.pollution || 'Data not available'}</p>
        `;
    } else {
        detailsContainer.innerHTML = `<h3>${properties.st_nm}</h3><p>No detailed demographic data available for this state.</p>`;
    }
}
