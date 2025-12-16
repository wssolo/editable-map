const API = "https://editable-map-api.ws530813759.workers.dev/";

let map;
let data = { spots: [], invalids: [] };

document.getElementById("enter").onclick = async () => {
  document.getElementById("cover").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  await init();
};

async function init() {
  const res = await fetch(API);
  data = await res.json();

  map = L.map("map").setView([39.9, 116.4], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

  renderAll();

  map.on("contextmenu", e => {
    if (confirm("新建机位？")) {
      addSpot(e.latlng);
    }
  });
}

function renderAll() {
  data.spots.forEach(drawSpot);
  data.invalids.forEach(drawInvalid);
  renderList();
}

function drawSpot(spot) {
  const colorMap = {
    active: "red",
    temporary: "blue",
    abandoned: "black",
    pending: "yellow"
  };

  const marker = L.circleMarker([spot.lat, spot.lng], {
    radius: 8,
    color: colorMap[spot.status]
  }).addTo(map);

  marker.on("click", () => {
    const last = spot.records[0];
    marker.bindPopup(
      last
        ? `<b>${spot.name}</b><br>${last.note || ""}`
        : `<b>${spot.name}</b><br>暂无记录`
    ).openPopup();
  });

  marker.on("dblclick", () => {
    alert(
      spot.records
        .map(r => r.time || "未填时间")
        .join("\n")
    );
  });
}

function drawInvalid(inv) {
  L.circleMarker([inv.lat, inv.lng], {
    radius: 6,
    color: "gray",
    opacity: 0.5
  }).addTo(map);
}

async function addSpot(latlng) {
  const name = prompt("机位名称");
  const status = prompt("状态 active / temporary / abandoned / pending", "active");
  if (!name || !status) return;

  data.spots.push({
    id: crypto.randomUUID(),
    lat: latlng.lat,
    lng: latlng.lng,
    name,
    status,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    statusNote: "",
    records: []
  });

  await save();
  location.reload();
}

async function save() {
  await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

function renderList() {
  const list = document.getElementById("spotList");
  list.innerHTML = "";
  data.spots.forEach(s => {
    const div = document.createElement("div");
    div.textContent = `${s.name} (${s.status})`;
    list.appendChild(div);
  });
}
