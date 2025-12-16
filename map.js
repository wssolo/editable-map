const API = "https://editable-map-api.ws530813759.workers.dev";

let map;
let drawLayer;
let drawControl;
let state = {};
let markers = [];

let invalidLayers = new Map();
let activeInvalidId = null;

/* ========= 工具 ========= */

function nowBJ() {
  return new Date(Date.now() + 8 * 3600 * 1000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/* ========= 状态 ========= */

async function fetchState() {
  const res = await fetch(API + "/");
  state = await res.json();

  if (!state || typeof state !== "object") state = {};
  if (!Array.isArray(state.spots)) state.spots = [];
  if (!Array.isArray(state.invalids)) state.invalids = [];
  if (typeof state.version !== "number") state.version = 1;
}

async function saveState() {
  state.version++;

  const res = await fetch(API + "/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state)
  });

  if (res.status === 409) {
    alert("数据被他人修改，请刷新页面");
    throw new Error("version conflict");
  }
}

/* ========= 初始化 ========= */

document.getElementById("enter").onclick = async () => {
  document.getElementById("cover").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  await init();
};

async function init() {
  await fetchState();

  map = L.map("map").setView([39.9, 116.4], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

  drawLayer = new L.FeatureGroup();
  map.addLayer(drawLayer);

  drawControl = new L.Control.Draw({
    draw: {
      polygon: true,
      rectangle: true,
      circle: true,
      marker: false,
      polyline: false
    },
    edit: {
      featureGroup: drawLayer,
      remove: true
    }
  });

  map.on(L.Draw.Event.CREATED, e => {
    const geo = e.layer.toGeoJSON();
    const id = uuid();

    state.invalids.push({ id, geo, createdAt: Date.now() });
    saveState();

    renderInvalids();
  });

  map.on(L.Draw.Event.DELETED, e => {
    e.layers.getLayers().forEach(layer => {
      for (const [id, l] of invalidLayers.entries()) {
        if (l === layer) {
          state.invalids = state.invalids.filter(i => i.id !== id);
          invalidLayers.delete(id);
        }
      }
    });

    saveState();
  });

  document.getElementById("drawInvalid").onclick = () => {
    map.addControl(drawControl);
  };

  render();
}

/* ========= invalid 渲染 ========= */

function renderInvalids() {
  invalidLayers.forEach(layer => drawLayer.removeLayer(layer));
  invalidLayers.clear();

  state.invalids.forEach(inv => {
    const layer = L.geoJSON(inv.geo, {
      style: {
        color: "#666",
        weight: 2,
        fillOpacity: 0.25
      }
    });

    layer.on("mouseover", () => {
      layer.setStyle({ weight: 4, fillOpacity: 0.35 });
    });

    layer.on("mouseout", () => {
      if (activeInvalidId !== inv.id) {
        layer.setStyle({ weight: 2, fillOpacity: 0.25 });
      }
    });

    layer.on("click", () => setActiveInvalid(inv.id));

    layer.addTo(drawLayer);
    invalidLayers.set(inv.id, layer);
  });
}

function setActiveInvalid(id) {
  activeInvalidId = id;
  invalidLayers.forEach((layer, lid) => {
    layer.setStyle(
      lid === id
        ? { color: "#999", weight: 4, fillOpacity: 0.4 }
        : { color: "#666", weight: 2, fillOpacity: 0.25 }
    );
  });
}

/* ========= 主渲染 ========= */

function render() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  renderInvalids();

  state.spots.forEach(spot => {
    const marker = L.circleMarker([spot.lat, spot.lng], {
      radius: 8,
      color: statusColor(spot.status)
    }).addTo(map);

    markers.push(marker);
  });
}

function statusColor(s) {
  return {
    active: "red",
    temporary: "blue",
    abandoned: "black",
    pending: "gold"
  }[s] || "gray";
}
