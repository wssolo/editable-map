const API_URL = "https://editable-map-api.ws530813759.workers.dev";

const enterBtn = document.getElementById("enter");
const cover = document.getElementById("cover");
const app = document.getElementById("app");

enterBtn.onclick = () => {
  cover.classList.add("hidden");
  app.classList.remove("hidden");
  initMap();
};

let map, data = [], markers = [];
let rightClickLatLng = null;

/* 初始化地图 */
function initMap() {
  map = L.map("map").setView([31.23, 121.47], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

  map.on("contextmenu", e => {
    rightClickLatLng = e.latlng;
    const ok = confirm("添加备注点？\n取消则添加快捷标记");
    ok ? addNote() : addQuick();
  });

  loadData();
}

/* 数据加载（修复超时崩溃） */
async function loadData() {
  try {
    const res = await fetch(API_URL);
    data = await res.json();
    render();
  } catch (e) {
    alert("无法连接后端，请检查 Worker 是否在线");
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

/* 添加点位 */
async function addNote() {
  data.push({
    id: crypto.randomUUID(),
    type: "note",
    lat: rightClickLatLng.lat,
    lng: rightClickLatLng.lng,
    records: []
  });
  save();
}

async function addQuick() {
  data.push({
    id: crypto.randomUUID(),
    type: "quick",
    lat: rightClickLatLng.lat,
    lng: rightClickLatLng.lng
  });
  save();
}

/* 保存 */
async function save() {
  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  loadData();
}

/* 查看记录 */
function showRecords(item) {
  let html = "<h3>摄影记录</h3>";
  item.records?.forEach(r => {
    html += `<div><strong>${r.time}</strong><br>${r.detail}</div><hr>`;
  });
  L.popup().setLatLng([item.lat, item.lng]).setContent(html).openOn(map);
}

/* 侧栏收起 */
document.getElementById("toggle").onclick = () => {
  document.getElementById("sidebar").classList.toggle("collapsed");
};

/* 搜索 */
document.getElementById("search").oninput = e => {
  const q = e.target.value;
  const filtered = data.filter(i => JSON.stringify(i).includes(q));
  render(filtered);
};
