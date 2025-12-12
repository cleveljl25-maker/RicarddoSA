// ===============================
// 🔥 Firebase SDK (MODULAR)
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔴 PEGA AQUÍ TU CONFIG REAL
const firebaseConfig = {
  apiKey: "AIzaSyA6Ocj2bhf2zGAfakobaFIVS9qMQVwsVtY",
  authDomain: "ricardo-apiladoras.firebaseapp.com",
  projectId: "ricardo-apiladoras",
  storageBucket: "ricardo-apiladoras.firebasestorage.app",
  messagingSenderId: "71506141186",
  appId: "1:71506141186:web:c0f9f46d8a0bfca4e3071b"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===============================
// 📌 ELEMENTOS DOM
// ===============================
const btnNew = document.getElementById("btnNew");
const btnAddMaint = document.getElementById("btnAddMaint");

const apList = document.getElementById("apList");
const totalCount = document.getElementById("totalCount");

const apDetails = document.getElementById("apDetails");
const emptyState = document.getElementById("emptyState");

const apName = document.getElementById("apName");
const apCode = document.getElementById("apCode");
const nextMaint = document.getElementById("nextMaint");

const mDesc = document.getElementById("mDesc");
const mDate = document.getElementById("mDate");
const mNext = document.getElementById("mNext");

const historyBox = document.getElementById("history");
const lastSync = document.getElementById("lastSync");

// ===============================
// 📦 ESTADO
// ===============================
let currentApiladoraId = null;

// ===============================
// ➕ NUEVA APILADORA
// ===============================
btnNew.addEventListener("click", async () => {
  const name = prompt("Nombre de la apiladora:");
  if (!name) return;

  const code = prompt("Código:");
  if (!code) return;

  await addDoc(collection(db, "apiladoras"), {
    name,
    code,
    history: [],
    createdAt: new Date()
  });
});

// ===============================
// 📥 CARGAR APILADORAS (TIEMPO REAL)
// ===============================
const q = query(collection(db, "apiladoras"), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
  apList.innerHTML = "";
  totalCount.textContent = snapshot.size;

  snapshot.forEach((docSnap) => {
    const ap = docSnap.data();
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <strong>${ap.name}</strong>
      <div class="muted">Código: ${ap.code}</div>
    `;
    div.onclick = () => selectApiladora(docSnap.id, ap);
    apList.appendChild(div);
  });

  lastSync.textContent = new Date().toLocaleString();
});

// ===============================
// 📌 SELECCIONAR APILADORA
// ===============================
function selectApiladora(id, ap) {
  currentApiladoraId = id;

  emptyState.style.display = "none";
  apDetails.style.display = "block";

  apName.textContent = ap.name;
  apCode.textContent = `Código: ${ap.code}`;

  renderHistory(ap.history || []);
}

// ===============================
// 🧾 HISTORIAL
// ===============================
function renderHistory(history) {
  historyBox.innerHTML = "";

  if (history.length === 0) {
    historyBox.innerHTML = `<div class="muted">Sin registros</div>`;
    nextMaint.textContent = "—";
    return;
  }

  history
    .slice()
    .reverse()
    .forEach((h) => {
      const div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML = `
        <strong>${h.date}</strong>
        <div class="muted">${h.desc}</div>
        <div class="muted">Próx: ${h.next}</div>
      `;
      historyBox.appendChild(div);
    });

  nextMaint.textContent = history[history.length - 1].next;
}

// ===============================
// ➕ AGREGAR MANTENIMIENTO
// ===============================
btnAddMaint.addEventListener("click", async () => {
  if (!currentApiladoraId) {
    alert("Selecciona una apiladora");
    return;
  }

  if (!mDesc.value || !mDate.value || !mNext.value) {
    alert("Completa todos los campos");
    return;
  }

  const ref = doc(db, "apiladoras", currentApiladoraId);

  await updateDoc(ref, {
    history: arrayUnion({
      desc: mDesc.value,
      date: mDate.value,
      next: mNext.value,
      createdAt: new Date()
    })
  });

  mDesc.value = "";
  mDate.value = "";
  mNext.value = "";
});
