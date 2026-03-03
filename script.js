const API_BASE_URL = "https://disaister-backend.onrender.com";

let map;
let heatLayer;
let userMarker;
let searchMarker;

let currentLat = 20.5937;
let currentLng = 78.9629;

// ================= INIT MAP =================

function initMap() {

    map = L.map("map").setView([currentLat, currentLng], 5);

    L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { attribution: "&copy; OpenStreetMap" }
    ).addTo(map);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {

            currentLat = pos.coords.latitude;
            currentLng = pos.coords.longitude;

            map.setView([currentLat, currentLng], 12);

            userMarker = L.circleMarker([currentLat, currentLng], {
                radius: 8,
                color: "#00ffcc"
            }).addTo(map).bindPopup("Your Location");
        });
    }

    fetchIncidents();
}

window.onload = initMap;


// ================= SEARCH =================

document.getElementById("searchInput").addEventListener("keydown", function(e) {
    if (e.key === "Enter") searchLocation();
});

async function searchLocation() {

    const query = document.getElementById("searchInput").value;
    if (!query) return;

    const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
    );

    const data = await res.json();
    if (!data.length) return;

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);

    currentLat = lat;      // 🔥 FIXED
    currentLng = lng;      // 🔥 FIXED

    map.setView([lat, lng], 12);

    if (searchMarker) map.removeLayer(searchMarker);

    searchMarker = L.circleMarker([lat, lng], {
        radius: 8,
        color: "#ffcc00"
    }).addTo(map).bindPopup("Selected Location").openPopup();
}


// ================= ANALYZE =================

async function analyzeIncident() {

    const message = document.getElementById("incidentInput").value;
    if (!message) return;

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
    if (!data.disaster_type) return;

    // Update risk panel instead of alert
    document.getElementById("primaryRisk").innerText = data.risk_level;

    fetchIncidents();
}


// ================= FETCH INCIDENTS =================

async function fetchIncidents() {

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
        radius: 35,
        blur: 25,
        maxZoom: 17
    }).addTo(map);
}


// ================= SOS =================

async function triggerSOS() {

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

    // Visual feedback instead of popup
    const btn = document.querySelector("button");
    btn.classList.add("animate-pulse");
}
