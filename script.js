const API_BASE_URL = "https://disaister-backend.onrender.com";

let map;
let markersLayer;
let heatLayer;
let userLat = null;
let userLng = null;
let remoteLocations = [];

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  setupSearch();
  fetchIncidents();
  setInterval(fetchIncidents, 15000);
});

/* =========================
   MAP INIT + LIVE LOCATION
========================= */
function initMap() {
  map = L.map("map").setView([20, 78], 5);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png")
    .addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;

      map.setView([userLat, userLng], 12);

      L.marker([userLat, userLng])
        .addTo(map)
        .bindPopup("📍 You are here")
        .openPopup();
    });
  }
}

/* =========================
   FETCH INCIDENTS + HEATMAP
========================= */
async function fetchIncidents() {
  const res = await fetch(`${API_BASE_URL}/incidents`);
  const incidents = await res.json();

  markersLayer.clearLayers();
  let heatData = [];

  incidents.forEach(i => {
    L.circleMarker([i.lat, i.lng], {
      radius: 8,
      color: i.severity >= 7 ? "red" : "orange"
    })
    .bindPopup(`${i.disaster_type}<br>${i.message}`)
    .addTo(markersLayer);

    heatData.push([i.lat, i.lng, i.severity / 10]);
  });

  if (heatLayer) map.removeLayer(heatLayer);
  heatLayer = L.heatLayer(heatData, { radius: 25 }).addTo(map);

  document.getElementById("primaryIncidentCount").innerText = incidents.length;
}

/* =========================
   AI INCIDENT REPORT
========================= */
async function sendAIQuery() {
  const input = document.getElementById("aiInput");
  const msg = input.value.trim();
  if (!msg || !userLat) return;

  await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      message: msg,
      lat: userLat,
      lng: userLng
    })
  });

  input.value = "";
  fetchIncidents();
}

/* =========================
   SOS
========================= */
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

  alert("SOS Activated");
}

/* =========================
   QUICK ACTIONS
========================= */
async function triggerAction(type) {
  if (!userLat) return;

  await fetch(`${API_BASE_URL}/action`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      type: type,
      lat: userLat,
      lng: userLng
    })
  });

  alert(type + " deployed");
}

/* =========================
   SEARCH + REMOTE MONITOR
========================= */
function setupSearch() {
  const input = document.getElementById("locationSearch");

  input.addEventListener("keydown", async e => {
    if (e.key === "Enter") {
      const query = input.value.trim();
      if (!query) return;

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
      );

      const data = await res.json();
      if (!data.length) return;

      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);

      L.marker([lat, lng]).addTo(map)
        .bindPopup("Monitored Location")
        .openPopup();

      map.setView([lat, lng], 10);

      remoteLocations.push(query);
      renderRemoteLocations();
      input.value = "";
    }
  });
}

function renderRemoteLocations() {
  const container = document.getElementById("remoteLocationsContainer");
  container.innerHTML = "";
  remoteLocations.forEach(loc => {
    const div = document.createElement("div");
    div.innerText = "• " + loc;
    container.appendChild(div);
  });
}
