// ===============================
// FIREBASE SDK
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===============================
// CONFIGURACIÓN (TUYA)
// ===============================
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
// ESTADO
// ===============================
let apiladoras = [];
let selectedId = null;

// ===============================
// UTIL
// ===============================
const today = () => new Date().toISOString().slice(0,10);

// ===============================
// CARGAR DESDE FIREBASE
// ===============================
async function loadApiladoras() {
  apiladoras = [];
  const q = query(collection(db, "apiladoras"), orderBy("created", "desc"));
  const snap = await getDocs(q);

  snap.forEach(docu => {
    apiladoras.push({ id: docu.id, ...docu.data() });
  });

  renderList();
}

// ===============================
// RENDER LISTA
// ===============================
function renderList() {
  const list = document.getElementById('apList');
  list.innerHTML = '';
  totalCount.innerText = apiladoras.length;

  if (apiladoras.length === 0) {
    list.innerHTML = `<div class="muted">No hay apiladoras</div>`;
    return;
  }

  apiladoras.forEach(a => {
    const div = document.createElement('div');
    div.className = 'ap-item';

    div.innerHTML = `
      <div>
        <strong>${a.name}</strong>
        <div class="muted">${a.code || ''}</div>
      </div>
      <button class="ghost">Eliminar</button>
    `;

    div.querySelector('button').onclick = (e) => {
      e.stopPropagation();
      deleteApiladora(a.id);
    };

    div.onclick = () => selectApiladora(a.id);
    list.appendChild(div);
  });
}

// ===============================
// SELECCIONAR
// ===============================
function selectApiladora(id) {
  selectedId = id;
  const a = apiladoras.find(x => x.id === id);
  if (!a) return;

  emptyState.style.display = 'none';
  apDetails.style.display = 'block';

  apName.innerText = a.name;
  apCode.innerText = a.code || '—';

  const next = a.history?.find(h => h.next)?.next;
  nextMaint.innerText = next || '—';

  renderHistory();
}

// ===============================
// HISTORIAL
// ===============================
function renderHistory() {
  history.innerHTML = '';
  const a = apiladoras.find(x => x.id === selectedId);
  if (!a || !a.history || a.history.length === 0) {
    history.innerHTML = `<div class="muted">Sin registros</div>`;
    return;
  }

  a.history.forEach(h => {
    history.innerHTML += `
      <div class="history-item">
        <strong>${h.desc}</strong><br>
        Fecha: ${h.date} — Próx: ${h.next || '—'}
      </div>
    `;
  });
}

// ===============================
// NUEVA APILADORA
// ===============================
async function addApiladora() {
  const name = prompt('Nombre de la apiladora');
  if (!name) return;

  const code = prompt('Código (opcional)');

  await addDoc(collection(db, "apiladoras"), {
    name,
    code,
    history: [],
    created: Date.now()
  });

  loadApiladoras();
}

// ===============================
// MANTENIMIENTO
// ===============================
async function addMaintenance() {
  if (!selectedId) return alert('Selecciona una apiladora');

  const desc = mDesc.value.trim();
  if (!desc) return;

  const a = apiladoras.find(x => x.id === selectedId);

  const newHistory = [
    {
      desc,
      date: mDate.value || today(),
      next: mNext.value || ''
    },
    ...(a.history || [])
  ];

  await updateDoc(doc(db, "apiladoras", selectedId), {
    history: newHistory
  });

  mDesc.value = '';
  mDate.value = '';
  mNext.value = '';

  loadApiladoras();
  selectApiladora(selectedId);
}

// ===============================
// ELIMINAR (🔥 DEFINITIVO)
// ===============================
async function deleteApiladora(id) {
  if (!confirm('¿Eliminar apiladora definitivamente?')) return;

  await deleteDoc(doc(db, "apiladoras", id));

  if (selectedId === id) {
    selectedId = null;
    apDetails.style.display = 'none';
    emptyState.style.display = 'block';
  }

  loadApiladoras();
}

// ===============================
// MENÚ
// ===============================
function showView(view) {
  document.querySelectorAll('[id^="view-"]').forEach(v => v.style.display = 'none');
  document.getElementById(`view-${view}`).style.display = 'block';

  document.querySelectorAll('.menu button').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-view="${view}"]`).classList.add('active');
}

// ===============================
// INIT
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  btnNew.onclick = addApiladora;
  btnAddMaint.onclick = addMaintenance;

  document.querySelectorAll('.menu button').forEach(btn => {
    btn.onclick = () => showView(btn.dataset.view);
  });

  showView('list');
  loadApiladoras();
});





