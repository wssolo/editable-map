// ← 把这行改成你自己的 Worker 地址（已帮你填好！）
const API = "https://editable-map-api.ws530813759.workers.dev/markers";

const map = L.map('map').setView([31.23, 121.47], 10);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

// 加载后台标记
async function loadMarkers() {
  try {
    const res = await fetch(API);
    const markers = await res.json();
    markers.forEach(m => {
      L.marker([m.lat, m.lng]).addTo(map);
    });
  } catch (e) {
    console.log("还未加载到标记（正常），后端可能还没数据");
  }
}
loadMarkers();

// 添加标记并保存到你的 Worker
map.on('click', async (e) => {
  L.marker(e.latlng).addTo(map);
  await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat: e.latlng.lat, lng: e.latlng.lng })
  });
});
