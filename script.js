// ===============================
// CONFIG
// ===============================

const API_BASE_URL = "https://disaister-backend.onrender.com"; // NO trailing slash

let map;
let userMarker;
let searchMarker;
let heatLayer;

let currentLat = 0;
let currentLng = 0;

// ===============================
// INITIALIZE MAP
// ===============================

function initMap() {
    map = L.map("map").setView([20.5937, 78.9629], 5); // India center

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    // Try getting user location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            currentLat = position.coords.latitude;
            currentLng = position.coords.longitude;

            map.setView([currentLat, currentLng], 12);

            userMarker = L.marker([currentLat, currentLng])
                .addTo(map)
                .bindPopup("You are here")
                .openPopup();

        });
    }

    fetchIncidents();
}

window.onload = initMap;

// ===============================
// SEARCH LOCATION
// ===============================

async function searchLocation() {
    const query = document.getElementById("searchInput").value;

    if (!query) return;

    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
    );

    const data = await response.json();

    if (data.length === 0) {
        alert("Location not found");
        return;
    }

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);

    map.setView([lat, lng], 12);

    if (searchMarker) {
        map.removeLayer(searchMarker);
    }

    searchMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup("Searched Location")
        .openPopup();

    // 🔥 VERY IMPORTANT FIX
    currentLat = lat;
    currentLng = lng;

    console.log("Updated coordinates:", currentLat, currentLng);
}

// ===============================
// ANALYZE INCIDENT
// ===============================

async function analyzeIncident() {
    const message = document.getElementById("incidentInput").value;

    if (!message) {
        alert("Please enter incident description");
        return;
    }

    const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: message,
            lat: currentLat,
            lng: currentLng
        })
    });

    const data = await response.json();

    if (!data || !data.disaster_type) {
        console.error("Invalid response:", data);
        alert("AI classification failed");
        return;
    }

    alert(
        `AI Analysis:\nType: ${data.disaster_type}\nSeverity: ${data.severity}\nRisk: ${data.risk_level}\nConfidence: ${data.confidence}%`
    );

    fetchIncidents();
}

// ===============================
// FETCH INCIDENTS + HEATMAP
// ===============================

async function fetchIncidents() {
    const response = await fetch(`${API_BASE_URL}/incidents`);
    const incidents = await response.json();

    if (!Array.isArray(incidents)) {
        console.error("Invalid incidents:", incidents);
        return;
    }

    // Update incident count
    document.getElementById("incidentCount").innerText = incidents.length;

    if (incidents.length === 0) return;

    // Remove old heat layer
    if (heatLayer) {
        map.removeLayer(heatLayer);
    }

    const heatPoints = incidents.map(i => [
        parseFloat(i.lat),
        parseFloat(i.lng),
        1
    ]);

    heatLayer = L.heatLayer(heatPoints, {
        radius: 30,
        blur: 20,
        maxZoom: 17
    }).addTo(map);
}

// ===============================
// SOS
// ===============================

async function triggerSOS() {
    const name = prompt("Enter your name:");
    const contact = prompt("Enter your contact number:");

    if (!name || !contact) return;

    await fetch(`${API_BASE_URL}/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: name,
            contact: contact,
            lat: currentLat,
            lng: currentLng
        })
    });

    alert("🚨 SOS Activated. Help is on the way!");
}
