const API_URL = "https://editable-map-api.ws530813759.workers.dev/";

const map = L.map("map").setView([31.23, 121.47], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let data = [];
let markers = [];

async function loadData() {
  const res = await fetch(API_URL);
  data = await res.json();
  renderList(data);
  renderMap(data);
}

function renderMap(list) {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  list.forEach(item => {
    const m = L.marker([item.lat, item.lng]).addTo(map);
    m.on("click", () => showRecords(item));
    markers.push(m);
  });
}

function renderList(list) {
  const el = document.getElementById("list");
  el.innerHTML = "";
  list.forEach(item => {
    const d = document.createElement("div");
    d.className = "item";
    d.textContent = item.records?.[0]?.location || "未命名机位";
    d.onclick = () => {
      map.setView([item.lat, item.lng], 17);
    };
    el.appendChild(d);
  });
}

function showRecords(item) {
  let html = "<h3>摄影记录</h3>";
  item.records.forEach(r => {
    html += `
      <div>
        <strong>${r.time}</strong><br>
        ${r.location}<br>
        ${r.detail}<br>
        ${r.imageUrl ? `<img src="${API_URL}${r.imageUrl}" width="100%">` : ""}
      </div><hr>
    `;
  });
  L.popup().setLatLng([item.lat, item.lng]).setContent(html).openOn(map);
}

document.getElementById("search").oninput = e => {
  const q = e.target.value;
  const filtered = data.filter(i =>
    JSON.stringify(i).includes(q)
  );
  renderList(filtered);
  renderMap(filtered);
};

loadData();

