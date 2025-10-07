// --- CONFIGURATION ---
const mapCenter = [22.5, 82.5];
const mapZoom = 5;
const AQI_API_KEY = "4bcf20e7bdeca3a1117d30b87bbeeccf84840960"; // <-- PASTE YOUR API KEY HERE

// --- DOM ELEMENTS ---
const yearSelect = document.getElementById('year-select');
const categorySelect = document.getElementById('category-select');
const kpiTitleEl = document.getElementById('kpi-title');
const kpiValueEl = document.getElementById('kpi-value');
const stateCountEl = document.getElementById('state-count');
const tableHeaderValue = document.getElementById('table-header-value');
const tableBody = document.querySelector("#data-table tbody");

// --- GLOBAL VARIABLES ---
let geojsonLayer;
let allData;
let map = L.map('map').setView(mapCenter, mapZoom);

// --- INITIALIZATION ---
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO'
}).addTo(map);

// Show a loading message
kpiValueEl.textContent = "Loading...";

Promise.all([
    fetch('india-states.geojson'),
    fetch('data.json')
]).then(responses => Promise.all(responses.map(res => res.json())))
  .then(async ([geojsonData, demographicData]) => {
    allData = geojsonData;

    // Merge static demographic data into the GeoJSON
    allData.features.forEach(feature => {
        const stateData = demographicData.find(d => d.state === feature.properties.st_nm);
        if (stateData) {
            feature.properties.demographics = stateData.data;
        }
    });

    // NOW, FETCH THE LIVE DATA
    kpiTitleEl.textContent = "Fetching Live AQI Data...";
    await fetchLiveAqiData(); // This new function will add live AQI to our data
    
    populateYearDropdown(demographicData);
    initializeDashboard();
    setupEventListeners();
  }).catch(error => console.error('Error loading data:', error));


// --- NEW DYNAMIC FUNCTION ---
async function fetchLiveAqiData() {
    const promises = allData.features.map(async (feature) => {
        if (feature.properties.demographics && feature.properties.demographics[0].cityForAQI) {
            const city = feature.properties.demographics[0].cityForAQI;
            const url = `https://api.waqi.info/feed/${city}/?token=${AQI_API_KEY}`;
            try {
                const response = await fetch(url);
                const aqiData = await response.json();
                if (aqiData.status === "ok") {
                    // Inject the live AQI value into our existing data structure
                    feature.properties.demographics[0].aqi = aqiData.data.aqi;
                } else {
                    feature.properties.demographics[0].aqi = null; // Mark as not available
                }
            } catch (error) {
                console.error(`Could not fetch AQI for ${city}:`, error);
                feature.properties.demographics[0].aqi = null;
            }
        }
    });
    // Wait for all the API calls to complete
    await Promise.all(promises);
}

function initializeDashboard() {
    geojsonLayer = L.geoJson(allData, { style: styleLayer }).addTo(map);
    updateDashboard();
}

function setupEventListeners() {
    yearSelect.addEventListener('change', updateDashboard);
    categorySelect.addEventListener('change', updateDashboard);
}

function updateDashboard() {
    const year = yearSelect.value;
    const category = categorySelect.value;
    const categoryName = categorySelect.options[categorySelect.selectedIndex].text;
    
    geojsonLayer.setStyle(styleLayer);

    let totalValue = 0;
    let stateCount = 0;
    const tableData = [];

    allData.features.forEach(feature => {
        if (feature.properties.demographics) {
            const yearData = feature.properties.demographics.find(d => d.year == year);
            if (yearData && yearData[category] !== undefined && yearData[category] !== null) {
                const value = yearData[category];
                totalValue += value;
                stateCount++;
                tableData.push({ name: feature.properties.st_nm, value: value });
            }
        }
    });
    
    const averageValue = stateCount > 0 ? (totalValue / stateCount).toFixed(1) : 0;
    
    kpiTitleEl.textContent = `National Average ${categoryName}`;
    kpiValueEl.textContent = averageValue;
    stateCountEl.textContent = stateCount;
    tableHeaderValue.textContent = categoryName;
    renderTable(tableData);
}

function renderTable(data) {
    data.sort((a, b) => b.value - a.value);
    
    tableBody.innerHTML = "";
    data.forEach(item => {
        const row = `<tr>
            <td>${item.name}</td>
            <td>${item.value.toLocaleString()}</td>
        </tr>`;
        tableBody.innerHTML += row;
    });
}

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
// (These functions remain the same as before)
function getPollutionColor(aqi) {
    if (aqi === null) return '#cccccc'; // Grey for unavailable data
    if (aqi > 300) return '#8c564b';
    if (aqi > 200) return '#9467bd';
    if (aqi > 150) return '#d62728';
    if (aqi > 100) return '#ff7f0e';
    if (aqi > 50) return '#ffdd71';
    return '#2ca02c';
}
function getSafetyColor(index) { /* ... same as before ... */ }
function getCostColor(index) { /* ... same as before ... */ }

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
    
    let color;
    switch(category) {
        case 'aqi': color = getPollutionColor(value); break;
        case 'safety_index': color = getSafetyColor(value); break;
        case 'cost_of_living_index': color = getCostColor(value); break;
        default: color = '#cccccc';
    }
    
    return {
        fillColor: color,
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.8
    };
}
