const API_URL = "https://editable-map-api.ws530813759.workers.dev";

let map = null;
let data = [];
let markers = [];
let mapInitialized = false;

// 首页 → 地图
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

  // ✅ 右键添加点位
  map.on("contextmenu", (e) => {
    const isNote = confirm("添加【备注点】？\n取消 = 添加快捷标记");
    isNote ? addNote(e.latlng) : addQuick(e.latlng);
  });

  loadData();
}

// ===== 数据 =====

async function loadData() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("fetch failed");
    data = await res.json();
    render();
  } catch (e) {
    alert("后端连接失败，请确认 Worker 正常运行");
  }
}

function render() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  const list = document.getElementById("list");
  list.innerHTML = "";

  data.forEach(item => {
    const marker = L.marker([item.lat, item.lng]).addTo(map);
    markers.push(marker);

    marker.on("dblclick", () => showRecords(item));

    const div = document.createElement("div");
    div.className = "item";
    div.textContent = item.records?.[0]?.detail || "未命名机位";
    div.onclick = () => map.setView([item.lat, item.lng], 17);
    list.appendChild(div);
  });
}

// ===== 添加 =====

function addNote(latlng) {
  data.push({
    id: crypto.randomUUID(),
    type: "note",
    lat: latlng.lat,
    lng: latlng.lng,
    records: [],
  });
  save();
}

function addQuick(latlng) {
  data.push({
    id: crypto.randomUUID(),
    type: "quick",
    lat: latlng.lat,
    lng: latlng.lng,
  });
  save();
}

// ===== 保存 =====

async function save() {
  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  loadData();
}

// ===== 查看 =====

function showRecords(item) {
  let html = "<h3>摄影记录</h3>";
  item.records?.forEach(r => {
    html += `<div><strong>${r.time}</strong><br>${r.detail}</div><hr>`;
  });

  L.popup()
    .setLatLng([item.lat, item.lng])
    .setContent(html)
    .openOn(map);
}

// ===== 侧栏收起 =====

document.getElementById("toggle").onclick = () => {
  document.getElementById("sidebar").classList.toggle("collapsed");
};

// ===== 搜索 =====

document.getElementById("search").oninput = e => {
  const q = e.target.value;
  const filtered = data.filter(i => JSON.stringify(i).includes(q));
  renderFiltered(filtered);
};

function renderFiltered(list) {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  list.forEach(item => {
    const marker = L.marker([item.lat, item.lng]).addTo(map);
    markers.push(marker);
  });
}
