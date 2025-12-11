const API = "https://YOUR_WORKER_URL/markers";

const map = L.map('map').setView([31.23, 121.47], 10);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

// 加载后台标记
async function loadMarkers() {
  const res = await fetch(API);
  const markers = await res.json();
  markers.forEach(m => {
    L.marker([m.lat, m.lng]).addTo(map);
  });
}

loadMarkers();

// 添加标记并保存
map.on('click', async (e) => {
  L.marker(e.latlng).addTo(map);

  await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat: e.latlng.lat, lng: e.latlng.lng })
  });
});
