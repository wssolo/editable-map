const API_BASE = "https://editable-map-api.ws530813759.workers.dev/";

let map;
let dataVersion = 0;

let spots = [];
let invalids = [];

let spotLayer = L.layerGroup();
let invalidLayer = L.featureGroup();

let drawControl;

/* ===================== 初始化 ===================== */

window.onload = init;

async function init() {
  await loadData();
  initMap();
  renderSpots();
  renderInvalids();
  bindUI();
}

/* ===================== 数据加载 ===================== */

async function loadData() {
  const res = await fetch(API_BASE);
  if (!res.ok) {
    alert("数据加载失败");
    return;
  }
  const json = await res.json();
  dataVersion = json.version || 0;
  spots = json.spots || [];
  invalids = json.invalids || [];
}

/* ===================== 地图 ===================== */

function initMap() {
  if (map) return; // 防止重复初始化

  map = L.map("map", {
    zoomControl: true,
    dragging: true,
    scrollWheelZoom: true,
    doubleClickZoom: false
  }).setView([39.9042, 116.4074], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map);

  spotLayer.addTo(map);
  invalidLayer.addTo(map);

  drawControl = new L.Control.Draw({
    draw: {
      polygon: true,
      rectangle: true,
      circle: true,
      marker: false,
      polyline: false,
      circlemarker: false
    },
    edit: {
      featureGroup: invalidLayer
    }
  });
}

/* ===================== 渲染 ===================== */

function renderSpots() {
  spotLayer.clearLayers();

  spots.forEach(spot => {
    const marker = L.circleMarker([spot.lat, spot.lng], {
      radius: 8,
      color: statusColor(spot.status),
      fillOpacity: 0.9
    });

    marker.on("click", () => showSpotPopup(spot, marker));
    marker.on("dblclick", () => openSpotRecords(spot));

    marker.addTo(spotLayer);
  });

  renderSpotList();
}

function renderInvalids() {
  invalidLayer.clearLayers();

  invalids.forEach(inv => {
    let layer;

    if (inv.type === "polygon") {
      layer = L.polygon(inv.latlngs, invalidStyle());
    } else if (inv.type === "rectangle") {
      layer = L.rectangle(inv.latlngs, invalidStyle());
    } else if (inv.type === "circle") {
      layer = L.circle(inv.center, {
        radius: inv.radius,
        ...invalidStyle()
      });
    }

    if (!layer) return;

    layer.on("mouseover", () => layer.setStyle({ fillOpacity: 0.4 }));
    layer.on("mouseout", () => layer.setStyle({ fillOpacity: 0.2 }));
    layer.on("contextmenu", () => {
      if (confirm("删除该无效区域？")) {
        invalids = invalids.filter(i => i.id !== inv.id);
        saveData();
        renderInvalids();
      }
    });

    layer.addTo(invalidLayer);
  });
}

/* ===================== UI ===================== */

function bindUI() {
  document.getElementById("addSpot").onclick = () => {
    alert("点击地图添加机位");
    map.once("click", e => createSpot(e.latlng));
  };

  document.getElementById("drawInvalid").onclick = () => {
    map.addControl(drawControl);
  };

  map.on(L.Draw.Event.CREATED, e => {
    const layer = e.layer;
    invalidLayer.addLayer(layer);

    invalids.push(parseInvalidLayer(layer));
    saveData();
  });

  document.getElementById("search").oninput = renderSpotList;
  document.getElementById("statusFilter").onchange = renderSpotList;
}

/* ===================== Spot 操作 ===================== */

function createSpot(latlng) {
  const name = prompt("机位名称");
  if (!name) return;

  const status = prompt("状态（active / temporary / pending / abandoned）", "active");

  spots.push({
    id: crypto.randomUUID(),
    lat: latlng.lat,
    lng: latlng.lng,
    name,
    status,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    records: []
  });

  saveData();
  renderSpots();
}

function showSpotPopup(spot, marker) {
  const last = spot.records[0];
  marker.bindPopup(`
    <strong>${spot.name}</strong><br/>
    状态：${spot.status}<br/>
    ${last ? "最近拍摄：" + last.time : "暂无记录"}
  `).openPopup();
}

function openSpotRecords(spot) {
  alert(`机位「${spot.name}」的记录列表（后续会是完整表单 UI）`);
}

/* ===================== 列表 ===================== */

function renderSpotList() {
  const list = document.getElementById("spotList");
  list.innerHTML = "";

  const keyword = document.getElementById("search").value.trim();
  const status = document.getElementById("statusFilter").value;

  spots
    .filter(s =>
      (!keyword || s.name.includes(keyword)) &&
      (!status || s.status === status)
    )
    .forEach(spot => {
      const div = document.createElement("div");
      div.textContent = spot.name + "（" + spot.status + "）";
      div.onclick = () => map.setView([spot.lat, spot.lng], 16);
      list.appendChild(div);
    });
}

/* ===================== 保存 ===================== */

async function saveData() {
  const body = {
    version: dataVersion,
    spots,
    invalids
  };

  const res = await fetch(API_BASE + "save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (res.status === 409) {
    alert("数据冲突，请刷新页面");
    return;
  }

  dataVersion++;
}

/* ===================== 工具 ===================== */

function statusColor(status) {
  return {
    active: "red",
    temporary: "blue",
    pending: "orange",
    abandoned: "black"
  }[status] || "gray";
}

function invalidStyle() {
  return {
    color: "#666",
    fillColor: "#999",
    fillOpacity: 0.2,
    weight: 1
  };
}

function parseInvalidLayer(layer) {
  if (layer instanceof L.Circle) {
    return {
      id: crypto.randomUUID(),
      type: "circle",
      center: layer.getLatLng(),
      radius: layer.getRadius(),
      createdAt: Date.now()
    };
  }

  return {
    id: crypto.randomUUID(),
    type: layer instanceof L.Rectangle ? "rectangle" : "polygon",
    latlngs: layer.getLatLngs(),
    createdAt: Date.now()
  };
}
