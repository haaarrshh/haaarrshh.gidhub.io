// --- CONFIGURATION ---
// Sets the initial center point and zoom level for the map of India.
const mapCenter = [22.5, 82.5];
const mapZoom = 5;

// --- DOM ELEMENTS ---
// Gets references to all the interactive HTML elements we need to update.
const yearSelect = document.getElementById('year-select');
const categorySelect = document.getElementById('category-select');
const kpiTitleEl = document.getElementById('kpi-title');
const kpiValueEl = document.getElementById('kpi-value');
const stateCountEl = document.getElementById('state-count');
const tableHeaderValue = document.getElementById('table-header-value');
const tableBody = document.querySelector("#data-table tbody");

// --- GLOBAL VARIABLES ---
let geojsonLayer; // This will hold the map layer.
let allData; // This will store the merged map and statistical data.
let map = L.map('map').setView(mapCenter, mapZoom); // Initializes the Leaflet map.

// --- INITIALIZATION ---
// Adds the visual base map tiles from CartoDB.
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
}).addTo(map);

// Fetches both the map shape data and your statistical data at the same time.
Promise.all([
    fetch('india-states.geojson'), // Or the path if it's in a subfolder
    fetch('data.json')
]).then(responses => Promise.all(responses.map(res => res.json())))
  .then(([geojsonData, demographicData]) => {
    allData = geojsonData;

    // This is a crucial step: it merges your demographic data into the map data.
    allData.features.forEach(feature => {
        // The state name property in the GeoJSON is 'st_nm'.
        const stateData = demographicData.find(d => d.state === feature.properties.st_nm);
        if (stateData) {
            feature.properties.demographics = stateData.data;
        }
    });

    populateYearDropdown(demographicData);
    initializeDashboard();
    setupEventListeners();
  }).catch(error => console.error('Error loading data:', error));

// Function to draw the map for the first time.
function initializeDashboard() {
    geojsonLayer = L.geoJson(allData, { style: styleLayer }).addTo(map);
    updateDashboard(); // Run once to show the initial data.
}

// Sets up listeners to know when the user changes a dropdown.
function setupEventListeners() {
    yearSelect.addEventListener('change', updateDashboard);
    categorySelect.addEventListener('change', updateDashboard);
}

// --- UPDATE FUNCTIONS ---
// This is the main function that runs every time a dropdown is changed.
function updateDashboard() {
    const year = yearSelect.value;
    const category = categorySelect.value;
    const categoryName = categorySelect.options[categorySelect.selectedIndex].text;
    
    // 1. Update Map Colors
    geojsonLayer.setStyle(styleLayer);

    // 2. Calculate and Update KPI Cards and Table Data
    let totalValue = 0;
    let stateCount = 0;
    const tableData = [];

    allData.features.forEach(feature => {
        if (feature.properties.demographics) {
            const yearData = feature.properties.demographics.find(d => d.year == year);
            if (yearData && yearData[category] !== undefined) {
                const value = yearData[category];
                totalValue += value;
                stateCount++;
                tableData.push({ name: feature.properties.st_nm, value: value });
            }
        }
    });
    
    const averageValue = stateCount > 0 ? (totalValue / stateCount).toFixed(1) : 0;
    
    // Update the text content of the HTML elements.
    kpiTitleEl.textContent = `National Average ${categoryName}`;
    kpiValueEl.textContent = averageValue;
    stateCountEl.textContent = stateCount;
    tableHeaderValue.textContent = categoryName;
    renderTable(tableData); // Call the function to redraw the table.
}

// Function to clear and redraw the data table.
function renderTable(data) {
    // Sort data from highest to lowest value before displaying.
    data.sort((a, b) => b.value - a.value);
    
    tableBody.innerHTML = ""; // Clear the existing table rows.
    data.forEach(item => {
        const row = `<tr>
            <td>${item.name}</td>
            <td>${item.value.toLocaleString()}</td>
        </tr>`;
        tableBody.innerHTML += row; // Add the new row.
    });
}

// --- HELPER FUNCTIONS ---
// Automatically fills the year dropdown based on the years available in your data.
function populateYearDropdown(demographicData) {
    const years = new Set();
    demographicData.forEach(state => {
        state.data.forEach(d => years.add(d.year));
    });
    
    yearSelect.innerHTML = "";
    Array.from(years).sort((a, b) => b - a).forEach(year => {
        const option = `<option value="${year}">${year}</option>`;
        yearSelect.innerHTML += option;
    });
}

// --- COLOR AND STYLE FUNCTIONS ---
function getPollutionColor(aqi) {
    if (aqi > 300) return '#8c564b'; // Hazardous
    if (aqi > 200) return '#9467bd'; // Very Unhealthy
    if (aqi > 150) return '#d62728'; // Unhealthy
    if (aqi > 100) return '#ff7f0e'; // Unhealthy for Sensitive
    if (aqi > 50) return '#ffdd71';  // Moderate
    return '#2ca02c';               // Good
}

function getSafetyColor(index) {
    if (index > 70) return '#2ca02c'; // Very Safe (Green)
    if (index > 50) return '#98df8a';
    if (index > 40) return '#ffdd71'; // Moderate (Yellow)
    return '#d62728';                 // Unsafe (Red)
}

function getCostColor(index) {
    if (index > 35) return '#d62728'; // Very High (Red)
    if (index > 30) return '#ff7f0e'; // High (Orange)
    if (index > 25) return '#ffdd71'; // Moderate (Yellow)
    return '#2ca02c';                 // Low (Green)
}

// This function is called for every state on the map to determine its style.
function styleLayer(feature) {
    const year = yearSelect.value;
    const category = categorySelect.value;
    let value;

    if (feature.properties.demographics) {
        const yearData = feature.properties.demographics.find(d => d.year == year);
        if (yearData) {
            value = yearData[category];
        }
    }
    
    // Choose the correct color scale based on the selected category.
    let color;
    switch(category) {
        case 'aqi': color = getPollutionColor(value); break;
        case 'safety_index': color = getSafetyColor(value); break;
        case 'cost_of_living_index': color = getCostColor(value); break;
        default: color = '#cccccc'; // Default grey if no data
    }
    
    return {
        fillColor: color,
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.8
    };
}
