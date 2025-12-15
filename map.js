const API_URL = "https://editable-map-api.ws530813759.workers.dev";

let map;
let markers = [];
let mapInitialized = false;

let data = {
  version: 1,
  updatedAt: Date.now(),
  points: []
};

// ===== 进入地图 =====
document.getElementById("enter").onclick = () => {
  document.getElementById("cover").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  if (!mapInitialized) {
    initMap();
    mapInitialized = true;
  }
};

function initMap() {
  map = L.map("map").setView([31.23, 121.47], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(map);

  map.on("contextmenu", e => {
    const isNote = confirm("添加备注点？\n取消 = 添加快捷标记");
    isNote ? addNote(e.latlng) : addQuick(e.latlng);
  });

  loadData();
}

// ===== 数据加载 =====
async function loadData() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("fetch failed");

    const json = await res.json();

    // ⭐ 兼容空 KV / 老数据
    data = json.points ? json : {
      version: 1,
      updatedAt: Date.now(),
      points: Array.isArray(json) ? json : []
    };

    render();
  } catch (e) {
    console.error(e);
    alert("后端连接失败，请确认 Worker 正常运行");
  }
}

// ===== 渲染 =====
function render() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  const list = document.getElementById("list");
  list.innerHTML = "";

  data.points.forEach(point => {
    const marker = L.marker([point.lat, point.lng]).addTo(map);
    markers.push(marker);

    marker.on("dblclick", () => showRecords(point));

    const div = document.createElement("div");
    div.className = "item";
    div.textContent =
      point.records?.[0]?.detail || "未命名机位";

    div.onclick = () => map.setView([point.lat, point.lng], 17);
    list.appendChild(div);
  });
}

// ===== 添加 =====
function addNote(latlng) {
  data.points.push({
    id: crypto.randomUUID(),
    type: "note",
    lat: latlng.lat,
    lng: latlng.lng,
    records: []
  });
  save();
}

function addQuick(latlng) {
  data.points.push({
    id: crypto.randomUUID(),
    type: "quick",
    lat: latlng.lat,
    lng: latlng.lng
  });
  save();
}

// ===== 保存 =====
async function save() {
  data.updatedAt = Date.now();

  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  loadData();
}

// ===== 查看 =====
function showRecords(point) {
  let html = "<h3>摄影记录</h3>";

  point.records?.forEach(r => {
    html += `
      <div>
        <strong>${r.time}</strong><br/>
        ${r.detail}
      </div>
      <hr/>
    `;
  });

  L.popup()
    .setLatLng([point.lat, point.lng])
    .setContent(html)
    .openOn(map);
}
