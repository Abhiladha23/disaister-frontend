const API_BASE_URL = "https://disaister-backend.onrender.com";

let map;
let markersLayer;
let heatLayer;
let userLat = null;
let userLng = null;
let monitored = [];

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  initSearch();
  fetchIncidents();
  setInterval(fetchIncidents, 15000);
});

function initMap() {
  map = L.map("map");

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png")
    .addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;

      map.setView([userLat, userLng], 10);

      L.marker([userLat, userLng])
        .addTo(map)
        .bindPopup("You are here")
        .openPopup();

      checkDanger();
    });
  }
}

async function fetchIncidents() {
  const res = await fetch(`${API_BASE_URL}/incidents`);
  const incidents = await res.json();

  markersLayer.clearLayers();
  let heatData = [];

  incidents.forEach(i => {
    L.circleMarker([i.lat, i.lng], {
      radius: 8,
      color: i.severity >= 7 ? "red" :
             i.severity >= 5 ? "orange" : "yellow"
    })
    .bindPopup(`<b>${i.disaster_type}</b><br>${i.message}`)
    .addTo(markersLayer);

    heatData.push([i.lat, i.lng, 1]);
  });

  if (heatLayer) map.removeLayer(heatLayer);
  heatLayer = L.heatLayer(heatData, { radius: 25 }).addTo(map);

  document.getElementById("primaryIncidentCount").innerText = incidents.length;

  if (incidents.length > 0) {
    const max = Math.max(...incidents.map(i => i.severity));
    document.getElementById("primaryRisk").innerText =
      max >= 7 ? "HIGH" :
      max >= 5 ? "MEDIUM" : "LOW";
  }
}

async function sendAIQuery() {
  const input = document.getElementById("aiInput");
  if (!input.value || !userLat) return;

  await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      message: input.value,
      lat: userLat,
      lng: userLng
    })
  });

  input.value = "";
  fetchIncidents();
}

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

  alert("SOS Sent");
}

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

  alert(type.toUpperCase() + " initiated");
}

async function checkDanger() {
  const res = await fetch(`${API_BASE_URL}/is-user-in-danger?lat=${userLat}&lng=${userLng}`);
  const data = await res.json();

  if (data.in_danger) {
    alert("⚠ You are in danger zone");
  }
}

function initSearch() {
  const input = document.getElementById("locationSearch");

  input.addEventListener("keydown", async e => {
    if (e.key === "Enter") {
      const query = input.value;
      const geo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
      const data = await geo.json();

      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);

        map.setView([lat, lng], 10);

        if (!monitored.includes(query)) {
          monitored.push(query);
          document.getElementById("remoteLocationsContainer")
            .innerHTML += `<div>• ${query}</div>`;

          L.marker([lat, lng]).addTo(map).bindPopup("Monitored Location");
        }
      }
    }
  });
}
