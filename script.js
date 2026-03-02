const API_BASE_URL = "https://disaister-backend.onrender.com";

let map;
let markersLayer;
let heatLayer;
let userMarker;
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

  const satellite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
  );

  satellite.addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;

      map.setView([userLat, userLng], 6);

      userMarker = L.marker([userLat, userLng])
        .addTo(map)
        .bindPopup("You are here")
        .openPopup();
    });
  } else {
    map.setView([20, 78], 5);
  }
}

async function fetchIncidents() {
  const res = await fetch(`${API_BASE_URL}/incidents`);
  const incidents = await res.json();

  markersLayer.clearLayers();

  if (heatLayer) {
    map.removeLayer(heatLayer);
  }

  let heatData = [];
  let bounds = [];

  incidents.forEach(i => {
    const marker = L.circleMarker([i.lat, i.lng], {
      radius: 10,
      color: i.severity >= 7 ? "#ff3b3b"
             : i.severity >= 5 ? "#ff9f1a"
             : "#ffd60a",
      fillOpacity: 0.9
    }).bindPopup(
      `<b>${i.disaster_type}</b><br>${i.message}<br>Severity: ${i.severity}`
    );

    marker.addTo(markersLayer);

    // Strong heat intensity
    heatData.push([i.lat, i.lng, 1]);

    bounds.push([i.lat, i.lng]);
  });

  if (heatData.length > 0) {
    heatLayer = L.heatLayer(heatData, {
      radius: 50,
      blur: 30,
      maxZoom: 12,
      gradient: {
        0.2: "blue",
        0.4: "lime",
        0.6: "orange",
        0.8: "red"
      }
    }).addTo(map);

    heatLayer.bringToFront();

    map.fitBounds(bounds, { padding: [80, 80] });
  }

  document.getElementById("primaryIncidentCount").innerText =
    incidents.length;

  if (incidents.length > 0) {
    const max = Math.max(...incidents.map(i => i.severity));
    document.getElementById("primaryRisk").innerText =
      max >= 7 ? "HIGH"
      : max >= 5 ? "MEDIUM"
      : "LOW";
  }
}

async function sendAIQuery() {
  const input = document.getElementById("aiInput");
  if (!input.value || userLat === null) return;

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

  alert("SOS Activated");
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

function initSearch() {
  const input = document.getElementById("locationSearch");

  input.addEventListener("keydown", async e => {
    if (e.key === "Enter") {

      const query = input.value.trim();
      if (!query) return;

      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
      );

      const data = await geo.json();

      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);

        map.setView([lat, lng], 8);

        if (!monitored.includes(query)) {
          monitored.push(query);

          const container =
            document.getElementById("remoteLocationsContainer");

          const div = document.createElement("div");
          div.textContent = "• " + query;
          container.appendChild(div);

          L.marker([lat, lng])
            .addTo(map)
            .bindPopup("Monitored Location");
        }

        input.value = "";
      }
    }
  });
}
