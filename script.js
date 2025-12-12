/* ===========================
   🔥 FIREBASE SDK
=========================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ===========================
   🔥 CONFIGURACIÓN FIREBASE
   👉 REEMPLAZA SOLO ESTO
=========================== */
const firebaseConfig = {
  apiKey: "AIzaSyA6Ocj2bhf2zGAfakobaFIVS9qMQVwsVtY",
  authDomain: "ricardo-apiladoras.firebaseapp.com",
  projectId: "ricardo-apiladoras",
  storageBucket: "ricardo-apiladoras.firebasestorage.app",
  messagingSenderId: "71506141186",
  appId: "1:71506141186:web:c0f9f46d8a0bfca4e3071b"
};

/* ===========================
   🔥 INICIALIZAR FIREBASE
=========================== */
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colApiladoras = collection(db, "apiladoras");

/* ===========================
   🔧 VARIABLES
=========================== */
let apiladoras = [];
let selectedId = null;

/* ===========================
   🔧 UTILIDADES
=========================== */
const today = () => new Date().toISOString().slice(0, 10);

/* ===========================
   🔄 CARGAR DESDE FIRESTORE
=========================== */
async function cargarApiladoras() {
  apiladoras = [];
  const snapshot = await getDocs(colApiladoras);

  snapshot.forEach(docu => {
    apiladoras.push({ id: docu.id, ...docu.data() });
  });

  renderList();
  renderAlerts();
  document.getElementById("lastSync").innerText = new Date().toLocaleString();
}

/* ===========================
   🗑️ ELIMINAR APILADORA (🔥)
=========================== */
window.eliminarApiladora = async function (id) {
  const ok = confirm("¿Seguro que deseas eliminar esta apiladora?");
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "apiladoras", id));

    if (selectedId === id) {
      selectedId = null;
      document.getElementById("apDetails").style.display = "none";
      document.getElementById("emptyState").style.display = "block";
    }

    await cargarApiladoras();
  } catch (e) {
    alert("Error al eliminar");
    console.error(e);
  }
};

/* ===========================
   ➕ AGREGAR APILADORA
=========================== */
async function addApiladora() {
  const name = prompt("Nombre de la apiladora:");
  if (!name) return;
  const code = prompt("Código o placa (opcional):") || "";

  await addDoc(colApiladoras, {
    name,
    code,
    history: []
  });

  await cargarApiladoras();
}

/* ===========================
   📋 RENDER LISTA
=========================== */
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
    const div = document.createElement("div");
    div.className = "ap-item";

    div.innerHTML = `
      <div>
        <strong>${a.name}</strong>
        <div class="meta">${a.code || "—"}</div>
      </div>
      <div style="text-align:right">
        <div class="muted">${a.history?.length || 0} registros</div>
        <button
          onclick="event.stopPropagation(); eliminarApiladora('${a.id}')"
          style="
            background:none;
            border:1px solid var(--gold-dark);
            color:var(--gold-dark);
            padding:4px 8px;
            border-radius:8px;
            font-size:11px;
            cursor:pointer;
          ">
          Eliminar
        </button>
      </div>
    `;

    div.onclick = () => selectApiladora(a.id);
    box.appendChild(div);
  });
}

/* ===========================
   📌 SELECCIONAR
=========================== */
function selectApiladora(id) {
  selectedId = id;
  const a = apiladoras.find(x => x.id === id);
  if (!a) return;

  document.getElementById("emptyState").style.display = "none";
  document.getElementById("apDetails").style.display = "block";
  document.getElementById("apName").innerText = a.name;
  document.getElementById("apCode").innerText = "Código: " + (a.code || "—");
  renderHistory();
}

/* ===========================
   🛠️ AGREGAR MANTENIMIENTO
=========================== */
async function addMaintenance() {
  if (!selectedId) return alert("Selecciona una apiladora");

  const desc = document.getElementById("mDesc").value.trim();
  const date = document.getElementById("mDate").value || today();
  const next = document.getElementById("mNext").value || "";

  if (!desc) return alert("Descripción requerida");

  const a = apiladoras.find(x => x.id === selectedId);
  a.history.unshift({ desc, date, next });

  await deleteDoc(doc(db, "apiladoras", a.id));
  await addDoc(colApiladoras, a);

  document.getElementById("mDesc").value = "";
  document.getElementById("mDate").value = "";
  document.getElementById("mNext").value = "";

  await cargarApiladoras();
}

/* ===========================
   📜 HISTORIAL
=========================== */
function renderHistory() {
  const box = document.getElementById("history");
  box.innerHTML = "";

  const a = apiladoras.find(x => x.id === selectedId);
  if (!a || !a.history.length) {
    box.innerHTML = `<div class="muted">Sin registros</div>`;
    return;
  }

  a.history.forEach(h => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `
      <strong>${h.desc}</strong>
      <div class="muted">Fecha: ${h.date}</div>
      <div class="muted">Próx: ${h.next || "—"}</div>
    `;
    box.appendChild(div);
  });
}

/* ===========================
   🔔 ALERTAS
=========================== */
function renderAlerts() {
  const box = document.getElementById("alertsBox");
  box.innerHTML = `<div class="muted">No hay alertas</div>`;
}

/* ===========================
   🚀 INICIO
=========================== */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnNew").onclick = addApiladora;
  document.getElementById("btnAddMaint").onclick = addMaintenance;
  document.getElementById("globalSearch").oninput = e => renderList(e.target.value);

  cargarApiladoras();
});
