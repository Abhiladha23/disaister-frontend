<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Disaster Intelligence System</title>

<!-- Leaflet CSS -->
<link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>

<style>
body {
    margin: 0;
    font-family: Arial, sans-serif;
    background: #0f172a;
    color: white;
}

header {
    padding: 15px;
    background: #111827;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

input, button {
    padding: 8px;
    border-radius: 6px;
    border: none;
    margin: 5px 0;
}

button {
    background: #00ffcc;
    cursor: pointer;
}

button:hover {
    background: #00ccaa;
}

#map {
    height: 70vh;
    width: 100%;
}

.panel {
    padding: 15px;
}
</style>
</head>
<body>

<header>
    <h2>🌍 Disaster Intelligence Map</h2>
    <input id="searchInput" placeholder="Search location & press Enter"/>
</header>

<div id="map"></div>

<div class="panel">
    <h3>Report Incident</h3>
    <input id="incidentInput" placeholder="Describe incident..." />
    <button onclick="analyzeIncident()">Analyze</button>

    <p>Primary Risk: <span id="primaryRisk">None</span></p>
    <p>Total Incidents: <span id="incidentCount">0</span></p>

    <hr>

    <button onclick="triggerSOS()">🚨 Trigger SOS</button>
    <button onclick="deployDrone()">🚁 Deploy Drone</button>
    <button onclick="requestAid()">🚑 Request Aid</button>
    <button onclick="evacuateArea()">🏃 Evacuate</button>
    <button onclick="lockdownArea()">🔒 Lockdown</button>
</div>

<!-- Leaflet JS -->
<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

<!-- Heat Plugin -->
<script src="https://unpkg.com/leaflet.heat/dist/leaflet-heat.js"></script>

<script>
const API_BASE_URL = "https://disaister-backend.onrender.com"; // change if needed

let map;
let heatLayer = null;
let userMarker = null;
let searchMarker = null;

let currentLat = 20.5937;
let currentLng = 78.9629;

window.addEventListener("load", () => {
    initMap();
    attachSearchListener();
    fetchIncidents();
});

function initMap() {
    map = L.map("map").setView([currentLat, currentLng], 5);

    L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { attribution: "&copy; OpenStreetMap contributors" }
    ).addTo(map);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                currentLat = position.coords.latitude;
                currentLng = position.coords.longitude;

                map.setView([currentLat, currentLng], 12);

                userMarker = L.circleMarker([currentLat, currentLng], {
                    radius: 8,
                    color: "#00ffcc"
                }).addTo(map).bindPopup("Your Location");
            },
            () => console.log("Geolocation blocked.")
        );
    }
}

function attachSearchListener() {
    const input = document.getElementById("searchInput");
    if (!input) return;

    input.addEventListener("keydown", async function (e) {
        if (e.key !== "Enter") return;

        const query = input.value.trim();
        if (!query) return;

        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`
            );

            const data = await res.json();
            if (!data.length) return;

            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);

            currentLat = lat;
            currentLng = lng;

            map.setView([lat, lng], 12);

            if (searchMarker) map.removeLayer(searchMarker);

            searchMarker = L.circleMarker([lat, lng], {
                radius: 8,
                color: "#ffcc00"
            }).addTo(map).bindPopup(query).openPopup();

        } catch (err) {
            console.log("Search failed", err);
        }
    });
}

async function analyzeIncident() {
    const input = document.getElementById("incidentInput");
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

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

        if (data.risk_level) {
            document.getElementById("primaryRisk").innerText = data.risk_level;
        }

        input.value = "";
        fetchIncidents();

    } catch (err) {
        console.log("Analyze failed", err);
    }
}

async function fetchIncidents() {
    try {
        const res = await fetch(`${API_BASE_URL}/incidents`);
        const incidents = await res.json();

        if (!Array.isArray(incidents)) return;

        document.getElementById("incidentCount").innerText = incidents.length;

        const heatPoints = incidents.map(i => [
            parseFloat(i.lat),
            parseFloat(i.lng),
            1
        ]);

        if (heatLayer) map.removeLayer(heatLayer);

        heatLayer = L.heatLayer(heatPoints, {
            radius: 30,
            blur: 25,
            maxZoom: 17
        }).addTo(map);

    } catch (err) {
        console.log("Fetch incidents failed", err);
    }
}

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

        alert("SOS Sent Successfully");

    } catch (err) {
        console.log("SOS failed", err);
    }
}

function deployDrone() {
    alert("Drone dispatched to location");
}

function requestAid() {
    alert("Aid team requested");
}

function evacuateArea() {
    alert("Evacuation initiated");
}

function lockdownArea() {
    alert("Lockdown activated");
}
</script>

</body>
</html>
