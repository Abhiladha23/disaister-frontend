const API_BASE_URL = "https://disaister-backend.onrender.com";

let map;
let markersLayer;
let heatLayer;
let userLat = null;
let userLng = null;

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  setupSearch();
  fetchIncidents();
  fetchMonitors();
  setInterval(fetchIncidents, 15000);
});

function initMap() {
  map = L.map("map");

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png")
    .addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  navigator.geolocation.getCurrentPosition(pos => {
    userLat = pos.coords.latitude;
    userLng = pos.coords.longitude;

    map.setView([userLat, userLng], 12);

    L.circleMarker([userLat, userLng], {
      radius: 8,
      color: "#00ffff"
    }).bindPopup("📍 Your Location").addTo(map);
  }, () => {
    map.setView([20, 78], 5);
  });
}

async function fetchIncidents() {
  const res = await fetch(`${API_BASE_URL}/incidents`);
  const incidents = await res.json();

  markersLayer.clearLayers();
  let heatData = [];

  incidents.forEach(i => {
    heatData.push([i.lat, i.lng, i.severity / 10]);

    L.circleMarker([i.lat, i.lng], {
      radius: 8,
      color: i.severity >= 7 ? "red" : "orange"
    })
    .bindPopup(i.message)
    .addTo(markersLayer);
  });

  if (heatLayer) map.removeLayer(heatLayer);

  if (heatData.length) {
    heatLayer = L.heatLayer(heatData, {
      radius: 30,
      blur: 20
    }).addTo(map);
  }

  document.getElementById("primaryIncidentCount").innerText = incidents.length;
}

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

async function triggerSOS() {
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

async function triggerAction(type) {
  await fetch(`${API_BASE_URL}/action`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      type,
      lat: userLat,
      lng: userLng
    })
  });
  alert(type + " executed");
}

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

      map.setView([lat, lng], 10);

      L.marker([lat, lng]).addTo(map)
        .bindPopup("Monitored Location")
        .openPopup();

      await fetch(`${API_BASE_URL}/monitor`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ name: query, lat, lng })
      });

      fetchMonitors();
      input.value = "";
    }
  });
}

async function fetchMonitors() {
  const res = await fetch(`${API_BASE_URL}/monitor`);
  const monitors = await res.json();

  const container = document.getElementById("remoteLocationsContainer");
  container.innerHTML = "";

  monitors.forEach(m => {
    const div = document.createElement("div");
    div.innerText = `${m.name} - ${m.risk}`;
    container.appendChild(div);
  });
}
