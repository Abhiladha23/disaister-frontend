const API_BASE_URL = "https://disaister-backend-2.onrender.com/";

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
  map = L.map("map").setView([20, 78], 5);

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
      .bindPopup(`${i.disaster_type}<br>${i.message}`);

    if (i.severity >= 6) {
      heatData.push([i.lat, i.lng, i.severity / 10]);
    }

    if (userLat && distance(userLat, userLng, i.lat, i.lng) < 0.5 && i.severity >= 7) {
      highRisk = true;
    }
  });

  if (heatLayer) map.removeLayer(heatLayer);
  heatLayer = L.heatLayer(heatData, { radius: 25 }).addTo(map);

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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      lat: userLat,
      lng: userLng
    })
  });

  const data = await res.json();

  alert(`AI Analysis:
Type: ${data.disaster_type}
Risk: ${data.risk_level}
Confidence: ${data.confidence}%`);

  fetchIncidents();
}

/* ---------------- SOS ---------------- */

async function triggerSOS() {
  if (!userLat) return;

  await fetch(`${API_BASE_URL}/sos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "User",
      contact: "N/A",
      lat: userLat,
      lng: userLng
    })
  });

  L.circle([userLat, userLng], {
    radius: 500,
    color: "red"
  }).addTo(map);

  alert("SOS activated. Rescue team notified.");
}

/* ---------------- QUICK ACTIONS ---------------- */

function triggerAction(type) {
  if (!userLat) return;

  if (type === "drone") {
    const drone = L.marker([userLat - 1, userLng]).addTo(map);
    drone.bindPopup("Drone dispatched").openPopup();

    setTimeout(() => {
      drone.setLatLng([userLat, userLng]);
    }, 2000);
  }

  if (type === "aid") {
    L.marker([userLat, userLng])
      .addTo(map)
      .bindPopup("Medical Aid dispatched")
      .openPopup();
  }

  if (type === "evacuate") {
    L.circle([userLat, userLng], {
      radius: 1000,
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
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
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
    Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2)
  );
}
