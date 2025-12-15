const API_URL = "https://editable-map-api.ws530813759.workers.dev/";

const map = L.map("map").setView([31.23, 121.47], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let data = [];
let currentRightClick = null;

const menu = document.getElementById("context-menu");
const panel = document.getElementById("panel");

/* ========== 工具 ========== */
function uuid() {
  return crypto.randomUUID();
}

function hideMenu() {
  menu.classList.add("hidden");
}

/* ========== 加载数据 ========== */
async function loadData() {
  const res = await fetch(API_URL);
  data = await res.json();
  render();
}

function render() {
  map.eachLayer(l => {
    if (l instanceof L.Marker) map.removeLayer(l);
  });

  data.forEach(item => {
    if (item.type === "note") {
      const m = L.marker([item.lat, item.lng]).addTo(map);
      m.on("contextmenu", e => noteMenu(e, item));
      m.on("dblclick", () => showPanel(item));
    } else {
      const icon = L.divIcon({ html: "❌", className: "" });
      const m = L.marker([item.lat, item.lng], { icon }).addTo(map);
      m.on("contextmenu", () => deleteItem(item.id));
    }
  });
}

/* ========== 右键地图 ========== */
map.on("contextmenu", e => {
  currentRightClick = e.latlng;
  menu.innerHTML = `
    <div id="add-note">添加备注点</div>
    <div id="add-quick">添加快捷标记</div>
  `;
  menu.style.left = e.originalEvent.pageX + "px";
  menu.style.top = e.originalEvent.pageY + "px";
  menu.classList.remove("hidden");

  document.getElementById("add-note").onclick = addNote;
  document.getElementById("add-quick").onclick = addQuick;
});

/* ========== 添加点 ========== */
async function addNote() {
  data.push({
    id: uuid(),
    type: "note",
    lat: currentRightClick.lat,
    lng: currentRightClick.lng,
    records: []
  });
  await save();
}

async function addQuick() {
  data.push({
    id: uuid(),
    type: "quick",
    lat: currentRightClick.lat,
    lng: currentRightClick.lng
  });
  await save();
}

/* ========== 备注点菜单 ========== */
function noteMenu(e, item) {
  menu.innerHTML = `
    <div id="add-record">添加摄影记录</div>
    <div id="delete-note">删除该点</div>
  `;
  menu.style.left = e.originalEvent.pageX + "px";
  menu.style.top = e.originalEvent.pageY + "px";
  menu.classList.remove("hidden");

  document.getElementById("add-record").onclick = () => addRecord(item);
  document.getElementById("delete-note").onclick = () => deleteItem(item.id);
}

/* ========== 摄影记录 ========== */
async function addRecord(item) {
  hideMenu();
  const time = prompt("拍摄时间");
  const location = prompt("拍摄地点");
  const detail = prompt("详情备注");

  if (!time) return;

  item.records.unshift({
    time,
    location,
    detail,
    updatedAt: Date.now()
  });
  await save();
}

/* ========== 面板 ========== */
function showPanel(item) {
  panel.classList.remove("hidden");
  panel.innerHTML = `<h3>摄影记录</h3>` +
    item.records.map((r, i) =>
      `<div>
        <strong>${r.time}</strong><br/>
        ${r.location}<br/>
        ${r.detail}
      </div><hr/>`
    ).join("");
}

/* ========== 删除 ========== */
async function deleteItem(id) {
  if (!confirm("确认删除？")) return;
  data = data.filter(i => i.id !== id);
  await save();
}

/* ========== 保存 ========== */
async function save() {
  hideMenu();
  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  loadData();
}

document.body.onclick = hideMenu;

loadData();
