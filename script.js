// ================= CONFIG =================

const API_BASE_URL = "https://disaister-backend.onrender.com";

let map;
let heatLayer = null;
let userMarker = null;
let searchMarker = null;

let currentLat = 20.5937;
let currentLng = 78.9629;


// ================= INIT =================

window.addEventListener("load", () => {
    initMap();
    attachSearchListener();
    fetchIncidents();
});


// ================= MAP INIT =================

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
            error => {
                console.log("Geolocation blocked or failed.");
            }
        );
    }
}


// ================= SEARCH =================

function attachSearchListener() {

    const input = document.getElementById("searchInput");
    if (!input) return;

    input.addEventListener("keydown", async function (e) {

        if (e.key !== "Enter") return;

        const query = input.value.trim();
        if (!query) return;

        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
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


// ================= ANALYZE INCIDENT =================

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


// ================= FETCH INCIDENTS =================

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

        console.log("SOS Sent");

    } catch (err) {
        console.log("SOS failed", err);
    }
}


// ================= ACTION BUTTONS =================

function deployDrone() {
    console.log("Drone dispatched to", currentLat, currentLng);
}

function requestAid() {
    console.log("Aid team requested at", currentLat, currentLng);
}

function evacuateArea() {
    console.log("Evacuation initiated");
}

function lockdownArea() {
    console.log("Lockdown activated");
}
