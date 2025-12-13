// ===============================
// 🔥 FIREBASE CONFIG
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA6Ocj2bhf2zGAfakobaFIVS9qMQVwsVtY",
  authDomain: "ricardo-apiladoras.firebaseapp.com",
  projectId: "ricardo-apiladoras",
  storageBucket: "ricardo-apiladoras.firebasestorage.app",
  messagingSenderId: "71506141186",
  appId: "1:71506141186:web:c0f9f46d8a0bfca4e3071b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===============================
// 🔧 VARIABLES
// ===============================
let apiladoras = [];
let selectedId = null;

// ===============================
// 🔧 UTILIDADES
// ===============================
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);

// ===============================
// 🔥 ESCUCHAR FIRESTORE (TIEMPO REAL)
// ===============================
onSnapshot(collection(db, "apiladoras"), (snapshot) => {
  apiladoras = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderList();
  renderAlerts();
  document.getElementById("lastSync").innerText = new Date().toLocaleString();
});

// ===============================
// 🗑️ ELIMINAR APILADORA (REAL)
// ===============================
window.eliminarApiladora = async (id) => {
  if (!confirm("¿Eliminar esta apiladora y todo su historial?")) return;

  try {
    await deleteDoc(doc(db, "apiladoras", id));
    if (selectedId === id) {
      selectedId = null;
      document.getElementById("apDetails").style.display = "none";
      document.getElementById("emptyState").style.display = "block";
    }
  } catch (e) {
    alert("Error al eliminar");
    console.error(e);
  }
};

// ===============================
// 📋 RENDER LISTA (BOTÓN FUNCIONA)
// ===============================
function renderList(filter = "") {
  const box = document.getElementById("apList");
  box.innerHTML = "";

  let list = apiladoras;
  if (filter) {
    const q = filter.toLowerCase();
    list = list.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.code || "").toLowerCase().includes(q)
    );
  }

  document.getElementById("totalCount").innerText = list.length;

  if (list.length === 0) {
    box.innerHTML = `<div class="muted">No hay apiladoras</div>`;
    return;
  }

  list.forEach(a => {
    const el = document.createElement("div");
    el.className = "ap-item";

    const left = document.createElement("div");
    left.innerHTML = `
      <strong>${a.name}</strong>
      <div class="meta">${a.code || "—"}</div>
    `;

    const right = document.createElement("div");
    right.style.textAlign = "right";

    const count = document.createElement("div");
    count.className = "muted";
    count.innerText = `${a.history?.length || 0} registros`;

    const btn = document.createElement("button");
    btn.className = "ghost";
    btn.innerText = "Eliminar";

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      eliminarApiladora(a.id);
    });

    right.appendChild(count);
    right.appendChild(btn);

    el.appendChild(left);
    el.appendChild(right);

    el.addEventListener("click", () => selectApiladora(a.id));
    box.appendChild(el);
  });
}

// ===============================
// 📌 SELECCIONAR
// ===============================
function selectApiladora(id) {
  selectedId = id;
  const a = apiladoras.find(x => x.id === id);
  if (!a) return;

  document.getElementById("emptyState").style.display = "none";
  document.getElementById("apDetails").style.display = "block";
  document.getElementById("apName").innerText = a.name;
  document.getElementById("apCode").innerText = "Código: " + (a.code || "—");
  document.getElementById("nextMaint").innerText = getNextFor(a) || "—";
  renderHistory();
}

function getNextFor(a) {
  const future = (a.history || []).filter(h => h.next).map(h => h.next).sort();
  return future[0] || "";
}

// ===============================
// ➕ NUEVA APILADORA
// ===============================
async function addApiladora() {
  const name = prompt("Nombre de la apiladora");
  if (!name) return;
  const code = prompt("Código (opcional)") || "";

  await addDoc(collection(db, "apiladoras"), {
    name,
    code,
    history: []
  });
}

// ===============================
// ➕ MANTENIMIENTO
// ===============================
async function addMaintenance() {
  if (!selectedId) return alert("Selecciona una apiladora");

  const desc = document.getElementById("mDesc").value.trim();
  const date = document.getElementById("mDate").value || today();
  const next = document.getElementById("mNext").value || "";

  if (!desc) return alert("Describe el mantenimiento");

  const a = apiladoras.find(x => x.id === selectedId);
  a.history.unshift({ id: uid(), desc, date, next });

  await addDoc(collection(db, "apiladoras"), { ...a });
}

// ===============================
// 📜 HISTORIAL
// ===============================
function renderHistory() {
  const box = document.getElementById("history");
  box.innerHTML = "";
  const a = apiladoras.find(x => x.id === selectedId);
  if (!a || !a.history?.length) {
    box.innerHTML = `<div class="muted">Sin historial</div>`;
    return;
  }

  a.history.forEach(h => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `
      <strong>${h.desc}</strong>
      <div class="muted">Fecha: ${h.date} | Próx: ${h.next || "—"}</div>
    `;
    box.appendChild(div);
  });
}

// ===============================
// 🔔 ALERTAS
// ===============================
function renderAlerts() {
  const box = document.getElementById("alertsBox");
  box.innerHTML = "";

  const now = new Date();
  const upcoming = [];

  apiladoras.forEach(a => {
    (a.history || []).forEach(h => {
      if (h.next) {
        const d = new Date(h.next + "T00:00:00");
        const diff = Math.ceil((d - now) / 86400000);
        if (diff >= 0 && diff <= 365) {
          upcoming.push({ a, h, diff });
        }
      }
    });
  });

  if (!upcoming.length) {
    box.innerHTML = `<div class="muted">No hay alertas</div>`;
    return;
  }

  upcoming.sort((x, y) => x.diff - y.diff);

  upcoming.slice(0, 6).forEach(u => {
    const el = document.createElement("div");
    el.className = "alert-item";
    el.innerHTML = `
      <strong>${u.a.name}</strong>
      <div class="muted">${u.h.next}</div>
      <div class="pill">${u.diff}d</div>
    `;
    box.appendChild(el);
  });
}

// ===============================
// 🎯 EVENTOS
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnNew").addEventListener("click", addApiladora);
  document.getElementById("btnAddMaint").addEventListener("click", addMaintenance);
  document.getElementById("globalSearch").addEventListener("input", e => renderList(e.target.value));
});



