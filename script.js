const API_BASE_URL = "http://127.0.0.1:8000";

let map;
let markersLayer;
let heatLayer;
let currentLayerName = "dark";

let layers = {};

let state = {
  activeFilter: "all"
};

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  initUI();
  updateTime();
  setInterval(updateTime, 1000);

  fetchIncidents();
  loadSatelliteFires();
  checkUserDanger();

  setInterval(fetchIncidents, 15000);
  setInterval(checkUserDanger, 20000);
});

function initMap() {
  map = L.map("map", { center: [13.0827, 80.2707], zoom: 6 });

  layers = {
    dark: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"),
    satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"),
    rain: L.tileLayer("https://tilecache.rainviewer.com/v2/radar/nowcast/{z}/{x}/{y}/2/1_1.png")
  };

  layers.dark.addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}

function switchLayer(layer) {
  map.removeLayer(layers[currentLayerName]);
  layers[layer].addTo(map);
  currentLayerName = layer;
}

function updateTime() {
  document.getElementById("currentTime").textContent =
    new Date().toLocaleTimeString();
}

function initUI() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeFilter = btn.dataset.filter;
      fetchIncidents();
    });
  });
}

async function sendAIQuery() {
  const input = document.getElementById("aiInput");
  const query = input.value.trim();
  if (!query) return;
  input.value = "";

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      message: query,
      lat: 13.0827,
      lng: 80.2707
    })
  });

  const data = await response.json();

  const badge = data.satellite_verified
    ? "<span style='color:lime'>Satellite Verified ✅</span>"
    : "<span style='color:orange'>Not Satellite Verified ⚠</span>";

  document.getElementById("aiChatContainer").innerHTML = `
    <div class="ai-response p-3 rounded-lg text-sm">
      Disaster: <b>${data.disaster_type}</b><br>
      Severity: <b>${data.severity}</b><br>
      Risk: <b>${data.risk_level}</b><br>
      Confidence: ${data.confidence}%<br>
      ${badge}
    </div>
  `;

  fetchIncidents();
}

async function fetchIncidents() {
  const res = await fetch(`${API_BASE_URL}/incidents`);
  const incidents = await res.json();

  markersLayer.clearLayers();

  let heatData = [];

  incidents.forEach(i => {
    if (state.activeFilter !== "all" &&
        i.disaster_type.toLowerCase() !== state.activeFilter) return;

    const color = i.severity >= 8 ? "red"
                 : i.severity >= 6 ? "orange"
                 : i.severity >= 4 ? "yellow"
                 : "green";

    L.circleMarker([i.lat, i.lng], {
      radius: 8,
      color: color
    }).bindPopup(`${i.disaster_type}: ${i.message}`)
      .addTo(markersLayer);

    heatData.push([i.lat, i.lng, i.severity / 10]);
  });

  if (heatLayer) map.removeLayer(heatLayer);
  heatLayer = L.heatLayer(heatData, { radius: 25 }).addTo(map);

  document.getElementById("primaryIncidentCount").innerText = incidents.length;
}

async function triggerSOS() {
  await fetch(`${API_BASE_URL}/sos`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      name: "Anonymous",
      contact: "N/A",
      lat: 13.0827,
      lng: 80.2707
    })
  });

  document.getElementById("sosStatus").innerText = "BEACON ACTIVE";
}

async function checkUserDanger() {
  const res = await fetch(
    `${API_BASE_URL}/is-user-in-danger?lat=13.0827&lng=80.2707`
  );
  const data = await res.json();

  if (data.in_danger) {
    alert(`⚠ You are in ${data.severity} danger zone`);
  }
}

async function loadSatelliteFires() {
  try {
    const res = await fetch(
      "https://firms.modaps.eosdis.nasa.gov/api/area/csv/VIIRS_SNPP_NRT/world/1/"
    );
    const text = await res.text();
    const rows = text.split("\n").slice(1);

    rows.forEach(r => {
      const p = r.split(",");
      if (p.length < 2) return;

      L.circleMarker([parseFloat(p[0]), parseFloat(p[1])], {
        radius: 4,
        color: "red"
      }).addTo(map);
    });
  } catch {}
}