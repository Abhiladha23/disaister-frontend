const API_BASE_URL = "https://disaister-backend.onrender.com";

let map;
let markersLayer;
let heatLayer;
let currentLayerName = "dark";
let layers = {};

let userLocation = {
  lat: null,
  lng: null
};

let state = {
  activeFilter: "all"
};

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  initUI();
  updateTime();
  setInterval(updateTime, 1000);

  getLiveLocation();
});

function getLiveLocation() {
  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(position => {
    userLocation.lat = position.coords.latitude;
    userLocation.lng = position.coords.longitude;

    map.setView([userLocation.lat, userLocation.lng], 10);

    L.marker([userLocation.lat, userLocation.lng])
      .addTo(map)
      .bindPopup("You are here")
      .openPopup();

    fetchIncidents();
    loadSatelliteFires();
    checkUserDanger();

    setInterval(fetchIncidents, 15000);
    setInterval(checkUserDanger, 20000);

  }, () => {
    alert("Location access denied");
  });
}

function initMap() {
  map = L.map("map", { center: [13.0827, 80.2707], zoom: 6 });

  layers = {
    dark: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"),
    satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}")
  };

  layers.dark.addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}

function switchLayer(layer) {
  map.removeLayer(layers[currentLayerName]);
  layers[layer].addTo(map);
  currentLayerName = layer;
}

function zoomToPrimary() {
  if (userLocation.lat && userLocation.lng) {
    map.setView([userLocation.lat, userLocation.lng], 12);
  }
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
  if (!query || !userLocation.lat) return;

  input.value = "";

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      message: query,
      lat: userLocation.lat,
      lng: userLocation.lng
    })
  });

  const data = await response.json();

  const badge = data.satellite_verified
    ? "<span style='color:lime'>Satellite Verified ✅</span>"
    : "<span style='color:orange'>Not Satellite Verified ⚠</span>";

  document.getElementById("aiChatContainer").innerHTML = `
    <div class="ai-response p-3 rounded-lg text-sm">
      <div class="text-xs text-[var(--accent-primary)] font-bold mb-1">AI RESPONSE</div>
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
        i.disaster_type.toLowerCase() !== state.activeFilter)
      return;

    const color =
      i.severity >= 8 ? "red" :
      i.severity >= 6 ? "orange" :
      i.severity >= 4 ? "yellow" :
      "green";

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

  const riskEl = document.getElementById("primaryRisk");

  if (incidents.length === 0) riskEl.innerText = "LOW";
  else if (incidents.length < 3) riskEl.innerText = "MEDIUM";
  else riskEl.innerText = "HIGH";
}

async function triggerSOS() {
  if (!userLocation.lat) return;

  await fetch(`${API_BASE_URL}/sos`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      name: "Anonymous",
      contact: "N/A",
      lat: userLocation.lat,
      lng: userLocation.lng
    })
  });

  document.getElementById("sosStatus").innerText = "BEACON ACTIVE";
  showToast("SOS Signal Sent!");
}

async function triggerAction(type) {
  if (!userLocation.lat) return;

  const res = await fetch(`${API_BASE_URL}/action`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      type: type,
      lat: userLocation.lat,
      lng: userLocation.lng
    })
  });

  const data = await res.json();
  showToast(data.message);
}

async function checkUserDanger() {
  if (!userLocation.lat) return;

  const res = await fetch(
    `${API_BASE_URL}/is-user-in-danger?lat=${userLocation.lat}&lng=${userLocation.lng}`
  );
  const data = await res.json();

  if (data.in_danger) {
    showToast(`⚠ You are in ${data.severity} danger zone`);
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

function showToast(message) {
  const toast = document.getElementById("toast");
  const msg = document.getElementById("toastMessage");

  msg.innerText = message;
  toast.classList.remove("opacity-0", "translate-y-20");
  toast.classList.add("opacity-100");

  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-20");
  }, 3000);
}
