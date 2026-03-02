const API_BASE_URL = "https://disaister-backend-1.onrender.com/";

let map;
let userLat = null;
let userLng = null;
let markersLayer;
let heatLayer;
let monitoredLocations = [];

/* ---------------- INIT ---------------- */

document.addEventListener("DOMContentLoaded", async () => {
  await initMap();
  initSearch();
  fetchIncidents();
  setInterval(fetchIncidents, 15000);
});

/* ---------------- MAP ---------------- */

async function initMap() {
  map = L.map("map").setView([22.5, 79.5], 5);

  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 18 }
  ).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;

      map.setView([userLat, userLng], 10);

      L.marker([userLat, userLng])
        .addTo(map)
        .bindPopup("You are here")
        .openPopup();
    });
  }
}

/* ---------------- INCIDENTS + HEATMAP ---------------- */

async function fetchIncidents() {
  const res = await fetch(`${API_BASE_URL}/incidents`);
  const incidents = await res.json();

  markersLayer.clearLayers();

  let heatData = [];
  let highRisk = false;

  incidents.forEach((i) => {
    const color =
      i.severity >= 8 ? "red" :
      i.severity >= 6 ? "orange" :
      i.severity >= 4 ? "yellow" : "green";

    L.circleMarker([i.lat, i.lng], {
      radius: 8,
      color: color
    })
      .addTo(markersLayer)
      .bindPopup(`<b>${i.disaster_type}</b><br>${i.message}`);

    heatData.push([i.lat, i.lng, Math.min(i.severity / 10, 1)]);

    if (userLat && distance(userLat, userLng, i.lat, i.lng) < 0.5 && i.severity >= 7) {
      highRisk = true;
    }
  });

  if (heatLayer) map.removeLayer(heatLayer);
  heatLayer = L.heatLayer(heatData, { radius: 30, blur: 25 }).addTo(map);

  document.getElementById("primaryIncidentCount").innerText = incidents.length;
  document.getElementById("primaryRisk").innerText = highRisk ? "HIGH" : "LOW";
}

/* ---------------- AI ---------------- */

async function sendAIQuery() {
  const input = document.getElementById("aiInput");
  const message = input.value.trim();
  if (!message || !userLat) return;

  input.value = "";

  const res = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      message,
      lat: userLat,
      lng: userLng
    })
  });

  const data = await res.json();

  if (!data.disaster_type) {
    alert("AI could not classify this incident.");
    return;
  }

  fetchIncidents();
}

/* ---------------- SOS ---------------- */

async function triggerSOS() {
  if (!userLat) return;

  await fetch(`${API_BASE_URL}/sos`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      name: "User",
      contact: "N/A",
      lat: userLat,
      lng: userLng
    })
  });

  L.circle([userLat, userLng], {
    radius: 700,
    color: "red"
  }).addTo(map);

  L.popup()
    .setLatLng([userLat, userLng])
    .setContent("🚨 SOS Activated. Rescue team dispatched.")
    .openOn(map);
}

/* ---------------- QUICK ACTIONS ---------------- */

function triggerAction(type) {
  if (!userLat) return;

  if (type === "drone") {
    const drone = L.marker([userLat - 1, userLng]).addTo(map);
    drone.bindPopup("🚁 Drone incoming...").openPopup();
    setTimeout(() => {
      drone.setLatLng([userLat, userLng]);
    }, 2000);
  }

  if (type === "aid") {
    L.popup()
      .setLatLng([userLat, userLng])
      .setContent("🩺 Medical Aid arriving at your location.")
      .openOn(map);
  }

  if (type === "evacuate") {
    L.circle([userLat, userLng], {
      radius: 1200,
      color: "yellow"
    }).addTo(map);
  }

  if (type === "lockdown") {
    L.circle([userLat, userLng], {
      radius: 1500,
      color: "purple"
    }).addTo(map);
  }
}

/* ---------------- SEARCH ---------------- */

function initSearch() {
  const input = document.getElementById("locationSearch");

  input.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;

    const query = input.value;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${query}`
    );

    const data = await res.json();
    if (!data.length) return;

    userLat = parseFloat(data[0].lat);
    userLng = parseFloat(data[0].lon);

    map.setView([userLat, userLng], 10);

    L.marker([userLat, userLng])
      .addTo(map)
      .bindPopup("Searched Location")
      .openPopup();

    monitoredLocations.push(query);
    renderMonitoring();
  });
}

/* ---------------- MONITORING ---------------- */

function renderMonitoring() {
  const container = document.getElementById("remoteLocationsContainer");
  container.innerHTML = "";

  monitoredLocations.forEach((loc) => {
    const div = document.createElement("div");
    div.innerText = "• " + loc;
    container.appendChild(div);
  });
}

/* ---------------- UTIL ---------------- */

function distance(lat1, lon1, lat2, lon2) {
  return Math.sqrt(
    Math.pow(lat1 - lat2, 2) +
    Math.pow(lon1 - lon2, 2)
  );
}
