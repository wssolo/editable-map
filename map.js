const API = "https://editable-map-api.ws530813759.workers.dev";

let map = null;
let drawLayer;
let drawControl;
let state = null;
let markers = [];
let initialized = false;

/* ================= 工具函数 ================= */

function nowBJ() {
  return new Date(Date.now() + 8 * 3600 * 1000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
}

function uuid() {
  return crypto.randomUUID();
}

function statusColor(status) {
  return {
    active: "red",
    temporary: "blue",
    abandoned: "black",
    pending: "gold"
  }[status] || "gray";
}

/* ================= 数据请求 ================= */

async function fetchState() {
  const res = await fetch(API + "/");
  if (!res.ok) throw new Error("后端连接失败");
  state = await res.json();

  // 兜底补结构
  state.version ??= 1;
  state.spots ??= [];
  state.invalids ??= [];
}

async function saveState() {
  const res = await fetch(API + "/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state)
  });

  if (res.status === 409) {
    alert("数据已被其他人更新，请刷新页面");
    throw new Error("version conflict");
  }

  if (!res.ok) {
    const t = await res.text();
    throw new Error(t);
  }
}

/* ================= 初始化 ================= */

document.getElementById("enter").onclick = async () => {
  document.getElementById("cover").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  await init();
};

async function init() {
  if (initialized) return;
  initialized = true;

  try {
    await fetchState();
  } catch (e) {
    alert(e.message);
    return;
  }

  map = L.map("map").setView([39.9, 116.4], 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  drawLayer = new L.FeatureGroup();
  map.addLayer(drawLayer);

  drawControl = new L.Control.Draw({
    draw: {
      polygon: true,
      rectangle: true,
      circle: true,
      marker: false,
      polyline: false
    },
    edit: {
      featureGroup: drawLayer,
      remove: true
    }
  });

  map.on(L.Draw.Event.CREATED, e => {
    const geo = e.layer.toGeoJSON();
    drawLayer.addLayer(e.layer);

    state.invalids.push({
      id: uuid(),
      geo,
      createdAt: Date.now()
    });

    saveState().catch(() => {});
  });

  map.on(L.Draw.Event.DELETED, e => {
    const removed = e.layers.getLayers().map(l =>
      JSON.stringify(l.toGeoJSON())
    );

    state.invalids = state.invalids.filter(
      inv => !removed.includes(JSON.stringify(inv.geo))
    );

    saveState().catch(() => {});
  });

  document.getElementById("drawInvalid").onclick = () => {
    map.addControl(drawControl);
  };

  document.getElementById("addSpot").onclick = () => {
    alert("点击地图选择机位位置");
    map.once("click", e => createSpot(e.latlng));
  };

  document.getElementById("search").oninput = render;
  document.getElementById("statusFilter").onchange = render;

  render();
}

/* ================= 渲染 ================= */

function render() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  drawLayer.clearLayers();

  // invalid 区域（专业 hover / 高亮）
  state.invalids.forEach(inv => {
    const layer = L.geoJSON(inv.geo, {
      style: {
        color: "#666",
        weight: 2,
        fillOpacity: 0.2
      }
    }).addTo(drawLayer);

    layer.on("mouseover", () => {
      layer.setStyle({ fillOpacity: 0.4 });
    });

    layer.on("mouseout", () => {
      layer.setStyle({ fillOpacity: 0.2 });
    });
  });

  const search = document.getElementById("search").value.trim();
  const statusFilter = document.getElementById("statusFilter").value;
  const list = document.getElementById("spotList");

  list.innerHTML = "";

  state.spots
    .filter(s => !search || s.name.includes(search))
    .filter(s => !statusFilter || s.status === statusFilter)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .forEach(spot => {
      const marker = L.circleMarker([spot.lat, spot.lng], {
        radius: 8,
        color: statusColor(spot.status),
        weight: 2,
        fillOpacity: 0.8
      }).addTo(map);

      marker.on("click", () => showQuickInfo(spot, marker));
      marker.on("dblclick", () => openSpotModal(spot));

      markers.push(marker);

      const div = document.createElement("div");
      div.textContent = `${spot.name}（${spot.status}）`;
      div.onclick = () => map.setView([spot.lat, spot.lng], 16);
      list.appendChild(div);
    });
}

/* ================= 机位 ================= */

function createSpot(latlng) {
  const name = prompt("机位名称");
  if (!name) return;

  const status = prompt(
    "状态：active / temporary / abandoned / pending",
    "active"
  );

  const spot = {
    id: uuid(),
    name,
    lat: latlng.lat,
    lng: latlng.lng,
    status,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    records: []
  };

  state.spots.push(spot);
  saveState()
    .then(render)
    .catch(() => {});
}

function showQuickInfo(spot, marker) {
  const last = spot.records
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];

  const html = `
    <strong>${spot.name}</strong><br>
    状态：${spot.status}<br>
    ${
      last
        ? `最近拍摄：${last.time || "未填"}`
        : "暂无摄影记录"
    }
  `;

  marker.bindPopup(html).openPopup();
}

/* ================= 弹窗 ================= */

function openSpotModal(spot) {
  closeModal();

  const modal = document.createElement("div");
  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-content">
      <h3>${spot.name}</h3>

      <label>状态</label>
      <select id="spotStatus">
        ${["active","temporary","pending","abandoned"]
          .map(s => `<option ${s===spot.status?"selected":""}>${s}</option>`)
          .join("")}
      </select>

      <button id="saveStatus">保存状态</button>

      <hr>
      <h4>摄影记录</h4>
      <button id="addRecord">新增记录</button>

      <ul>
        ${spot.records
          .sort((a,b)=>b.updatedAt-a.updatedAt)
          .map(r=>`
            <li>
              ${r.time || "未填时间"}
              <button data-id="${r.id}" class="edit">编辑</button>
              <button data-id="${r.id}" class="del">删除</button>
            </li>
          `).join("")}
      </ul>

      <button id="deleteSpot">删除机位</button>
      <button onclick="closeModal()">关闭</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("saveStatus").onclick = async () => {
    spot.status = document.getElementById("spotStatus").value;
    spot.updatedAt = Date.now();
    await saveState();
    render();
    closeModal();
  };

  document.getElementById("deleteSpot").onclick = async () => {
    if (!confirm("确认删除机位及全部记录？")) return;
    state.spots = state.spots.filter(s => s.id !== spot.id);
    await saveState();
    render();
    closeModal();
  };

  document.getElementById("addRecord").onclick = () =>
    openRecordModal(spot);

  modal.querySelectorAll(".edit").forEach(btn => {
    btn.onclick = () =>
      openRecordModal(
        spot,
        spot.records.find(r => r.id === btn.dataset.id)
      );
  });

  modal.querySelectorAll(".del").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("删除该记录？")) return;
      spot.records = spot.records.filter(r => r.id !== btn.dataset.id);
      spot.updatedAt = Date.now();
      await saveState();
      openSpotModal(spot);
    };
  });
}

/* ================= 摄影记录 ================= */

function openRecordModal(spot, record = null) {
  closeModal();

  const isNew = !record;
  if (!record) {
    record = {
      id: uuid(),
      time: nowBJ(),
      note: "",
      images: [],
      updatedAt: Date.now()
    };
  }

  const modal = document.createElement("div");
  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-content">
      <h3>${isNew ? "新增" : "编辑"}摄影记录</h3>

      <label>拍摄时间</label>
      <input id="time" value="${record.time || ""}">

      <label>备注</label>
      <textarea id="note">${record.note || ""}</textarea>

      <button id="saveRecord">保存</button>
      <button onclick="closeModal()">取消</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("saveRecord").onclick = async () => {
    record.time = document.getElementById("time").value;
    record.note = document.getElementById("note").value;
    record.updatedAt = Date.now();

    if (isNew) spot.records.push(record);
    spot.updatedAt = Date.now();

    await saveState();
    openSpotModal(spot);
  };
}

/* ================= 工具 ================= */

function closeModal() {
  document.querySelectorAll(".modal").forEach(m => m.remove());
}
