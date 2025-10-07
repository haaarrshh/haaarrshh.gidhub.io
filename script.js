const AQI_API_KEY = "4bcf20e7bdeca3a1117d30b87bbeeccf84840960";

// Get the main container element from the HTML.
const container = document.getElementById('states-container');

// This is an 'async' function, which means it can use the 'await' keyword
// to wait for asynchronous operations like API calls to finish.
async function loadStateData() {
    try {
        // 1. Fetch the local base data from your data.json file.
        const response = await fetch('data.json');
        const statesBaseData = await response.json();

        // Clear the "Loading..." message.
        container.innerHTML = "";

        // 2. Loop through each state from your JSON file.
        for (const state of statesBaseData) {
            // Construct the API URL for the Air Quality Index.
            const aqiUrl = `https://api.waqi.info/feed/${state.cityForAQI}/?token=${AQI_API_KEY}`;
            
            let pollutionData = 'Not available';
            try {
                // 3. Fetch the live pollution data for the current state's city.
                const aqiResponse = await fetch(aqiUrl);
                const aqiJson = await aqiResponse.json();

                // Check if the API call was successful and data exists.
                if (aqiJson.status === "ok") {
                    const aqi = aqiJson.data.aqi;
                    let quality = getAqiQuality(aqi);
                    pollutionData = `AQI: ${aqi} (${quality})`;
                } else {
                    pollutionData = `Could not fetch for ${state.cityForAQI}.`;
                }
            } catch (error) {
                console.error(`Error fetching AQI for ${state.name}:`, error);
                pollutionData = 'Error loading data.';
            }

            // 4. Create and display the card with combined data.
            createStateCard(state, pollutionData);
        }
    } catch (error) {
        console.error("Failed to load base state data:", error);
        container.innerHTML = "<p class='loading'>Error: Could not load initial state data. Please try again later.</p>";
    }
}

// A helper function to create the HTML card for each state.
function createStateCard(stateInfo, pollutionInfo) {
    const card = document.createElement('div');
    card.className = 'state-card';

    card.innerHTML = `
        <h2>${stateInfo.name} <span class="state-type">(${stateInfo.type})</span></h2>
        <p><strong>Live Pollution:</strong> ${pollutionInfo}</p>
        <p><strong>Human Rights:</strong> ${stateInfo.humanRights}</p>
        <p><strong>Safety:</strong> ${stateInfo.safety}</p>
        <p><strong>Cost of Living:</strong> ${stateInfo.costOfLiving}</p>
    `;

    container.appendChild(card);
}

// A helper function to determine air quality from the AQI value.
function getAqiQuality(aqi) {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy for Sensitive Groups";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
}


// Run the main function when the script loads.
loadStateData();
