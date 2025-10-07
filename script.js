// This is where you'll store all your data.
const statesData = [
    {
        name: "California",
        pollution: "Moderate (AQI: 75)",
        humanRights: "Good",
        safety: "Average",
        costOfLiving: "Very High"
    },
    {
        name: "Texas",
        pollution: "Moderate (AQI: 80)",
        humanRights: "Fair",
        safety: "Average",
        costOfLiving: "Low"
    },
    {
        name: "Wyoming",
        pollution: "Low (AQI: 30)",
        humanRights: "Good",
        safety: "High",
        costOfLiving: "Average"
    }
    // Add more states here!
];

// This function takes the data and displays it on the page.
function displayStates() {
    const container = document.getElementById('states-container');

    statesData.forEach(state => {
        // Create a 'div' for each state's card
        const card = document.createElement('div');
        card.className = 'state-card';

        // Add the state's information to the card
        card.innerHTML = `
            <h2>${state.name}</h2>
            <p><strong>Pollution Level:</strong> ${state.pollution}</p>
            <p><strong>Human Rights Position:</strong> ${state.humanRights}</p>
            <p><strong>Safety:</strong> ${state.safety}</p>
            <p><strong>Cost of Living:</strong> ${state.costOfLiving}</p>
        `;

        // Add the new card to the main container
        container.appendChild(card);
    });
}

// Run the function when the page loads
displayStates();