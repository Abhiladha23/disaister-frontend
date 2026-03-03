const API_BASE_URL = "https://disaister-backend.onrender.com";

let map;
let heatLayer;
let searchMarker;
let userMarker;

let currentLat = 20.5937;
let currentLng = 78.9629;

function initMap() {
    map = L.map("map").setView([currentLat, currentLng], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
    }).addTo(map);

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


// ================= SEARCH =================

async function searchLocation() {
    const query = document.getElementById("searchInput").value;
    if (!query) return;

    const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
    );

    const data = await res.json();

    if (!data.length) {
        alert("Location not found");
        return;
    }

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);

    currentLat = lat;   // 🔥 IMPORTANT FIX
    currentLng = lng;   // 🔥 IMPORTANT FIX

    map.setView([lat, lng], 12);

    if (searchMarker) map.removeLayer(searchMarker);

    searchMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup("Selected Location")
        .openPopup();
}


// ================= ANALYZE =================

async function analyzeIncident() {
    const message = document.getElementById("incidentInput").value;

    if (!message) {
        alert("Please enter incident description");
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message,
                lat: currentLat,
                lng: currentLng
            })
        });

        const data = await res.json();

        if (!data.disaster_type) {
            alert("AI classification failed");
            return;
        }

        alert(
            `Type: ${data.disaster_type}
Severity: ${data.severity}
Risk: ${data.risk_level}
Confidence: ${data.confidence}%`
        );

        fetchIncidents();

    } catch (err) {
        console.error(err);
        alert("Analyze failed");
    }
}


// ================= FETCH INCIDENTS =================

async function fetchIncidents() {
    try {
        const res = await fetch(`${API_BASE_URL}/incidents`);
        const incidents = await res.json();

        if (!Array.isArray(incidents)) return;

        document.getElementById("incidentCount").innerText = incidents.length;

        if (heatLayer) map.removeLayer(heatLayer);

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

    } catch (err) {
        console.error("Fetch incidents error:", err);
    }
}


// ================= SOS =================

async function triggerSOS() {
    try {
        await fetch(`${API_BASE_URL}/sos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "User",
                contact: "9999999999",
                lat: currentLat,
                lng: currentLng
            })
        });

        alert("🚨 SOS Activated");

    } catch (err) {
        console.error(err);
    }
}
