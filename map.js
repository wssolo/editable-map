const API_URL = "https://你的-worker地址.workers.dev";

let currentMapType = "amap";
let map = null;

/* ======================
   安全初始化高德
====================== */
function tryInitAMap() {
  if (typeof AMap === "undefined") {
    console.warn("高德地图加载失败，自动切换到 OSM");
    currentMapType = "osm";
    initOSM();
    return;
  }
  initAMap();
}

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
   通用
====================== */
function clearMap() {
  document.getElementById("map").innerHTML = "";
}

async function loadMarkers() {
  const res = await fetch(API_URL);
  const data = await res.json();

  data.forEach(item => {
    if (currentMapType === "amap" && typeof AMap !== "undefined") {
      new AMap.Marker({
        position: [item.lng, item.lat],
        title: item.text,
        map
      });
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
   切换按钮
====================== */
document.getElementById("btn-amap").onclick = () => {
  currentMapType = "amap";
  tryInitAMap();
};

document.getElementById("btn-osm").onclick = () => {
  currentMapType = "osm";
  initOSM();
};

/* ======================
   默认启动（安全）
====================== */
setTimeout(tryInitAMap, 300);
