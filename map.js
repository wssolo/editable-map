const API_URL = "https://你的-worker地址.workers.dev";

let currentMapType = "amap";
let map = null;
let markers = [];

/* ======================
   高德地图
====================== */
function initAMap() {
  clearMap();

  map = new AMap.Map("map", {
    zoom: 5,
    center: [116.4074, 39.9042]
  });

  map.on("click", async (e) => {
    const text = prompt("请输入标记名称：");
    if (!text) return;

    await saveMarker(e.lnglat.lat, e.lnglat.lng, text);
    loadMarkers();
  });

  loadMarkers();
}

/* ======================
   OpenStreetMap
====================== */
function initOSM() {
  clearMap();

  map = L.map("map").setView([39.9042, 116.4074], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  map.on("click", async (e) => {
    const text = prompt("请输入标记名称：");
    if (!text) return;

    await saveMarker(e.latlng.lat, e.latlng.lng, text);
    loadMarkers();
  });

  loadMarkers();
}

/* ======================
   通用逻辑
====================== */
function clearMap() {
  document.getElementById("map").innerHTML = "";
  markers = [];
}

async function loadMarkers() {
  const res = await fetch(API_URL);
  const data = await res.json();

  data.forEach(item => {
    if (currentMapType === "amap") {
      const marker = new AMap.Marker({
        position: [item.lng, item.lat],
        title: item.text
      });
      marker.setMap(map);
    } else {
      L.marker([item.lat, item.lng])
        .addTo(map)
        .bindPopup(item.text);
    }
  });
}

async function saveMarker(lat, lng, text) {
  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng, text })
  });
}

/* ======================
   按钮切换
====================== */
document.getElementById("btn-amap").onclick = () => {
  currentMapType = "amap";
  initAMap();
};

document.getElementById("btn-osm").onclick = () => {
  currentMapType = "osm";
  initOSM();
};

/* ======================
   默认加载高德
====================== */
initAMap();

