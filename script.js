// ===============================
// Firebase SDK
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===============================
// Firebase config (TU PROYECTO)
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
const colRef = collection(db, "apiladoras");

// ===============================
let apiladoras = [];
let selectedId = null;

const today = () => new Date().toISOString().slice(0,10);

// ===============================
// 🔥 LISTENER EN TIEMPO REAL
// ===============================
onSnapshot(query(colRef, orderBy("name")), (snap) => {
  apiladoras = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
  renderList();
  renderAlerts();
});

// ===============================
// RENDER LISTA
// ===============================
function renderList(filter=''){
  const box = document.getElementById('apList');
  box.innerHTML = '';

  let list = apiladoras;
  if(filter){
    const q = filter.toLowerCase();
    list = list.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.code||'').toLowerCase().includes(q)
    );
  }

  document.getElementById('totalCount').innerText = list.length;

  list.forEach(a => {
    const el = document.createElement('div');
    el.className = 'ap-item';
    el.innerHTML = `
      <div>
        <strong>${a.name}</strong>
        <div class="meta">${a.code || '—'}</div>
      </div>
      <div style="text-align:right">
        <div class="muted">${a.history?.length || 0} registros</div>
        <button class="btn ghost" style="margin-top:4px"
          onclick="event.stopPropagation(); eliminarApiladora('${a.id}')">
          Eliminar
        </button>
      </div>
    `;
    el.onclick = () => selectApiladora(a.id);
    box.appendChild(el);
  });
}

// ===============================
// 🔥 ELIMINAR REAL EN FIRESTORE
// ===============================
window.eliminarApiladora = async (id) => {
  if(!confirm("¿Eliminar apiladora y todo su historial?")) return;
  await deleteDoc(doc(db, "apiladoras", id));
  if(selectedId === id){
    selectedId = null;
    document.getElementById('apDetails').style.display='none';
    document.getElementById('emptyState').style.display='block';
  }
};

// ===============================
// SELECCIONAR
// ===============================
function selectApiladora(id){
  selectedId = id;
  const a = apiladoras.find(x=>x.id===id);
  if(!a) return;

  document.getElementById('emptyState').style.display='none';
  document.getElementById('apDetails').style.display='block';
  document.getElementById('apName').innerText = a.name;
  document.getElementById('apCode').innerText = 'Código: ' + (a.code||'—');
  document.getElementById('nextMaint').innerText = getNext(a) || '—';

  renderHistory();
}

function getNext(a){
  return (a.history||[])
    .map(h=>h.next)
    .filter(Boolean)
    .sort()[0];
}

// ===============================
// AGREGAR APILADORA
// ===============================
async function addApiladora(){
  const name = prompt("Nombre de la apiladora:");
  if(!name) return;
  const code = prompt("Código (opcional):");

  await addDoc(colRef, {
    name,
    code: code || '',
    history: []
  });
}

// ===============================
// AGREGAR MANTENIMIENTO
// ===============================
async function addMaintenance(){
  if(!selectedId) return alert("Selecciona una apiladora");

  const desc = mDesc.value.trim();
  const date = mDate.value || today();
  const next = mNext.value;

  if(!desc) return alert("Descripción obligatoria");

  const a = apiladoras.find(x=>x.id===selectedId);
  a.history.unshift({ desc, date, next });

  await updateDoc(doc(db,"apiladoras",selectedId), {
    history: a.history
  });

  mDesc.value = mDate.value = mNext.value = '';
}

// ===============================
// HISTORIAL
// ===============================
function renderHistory(){
  const box = document.getElementById('history');
  box.innerHTML = '';
  const a = apiladoras.find(x=>x.id===selectedId);
  if(!a || !a.history?.length){
    box.innerHTML = '<div class="muted">Sin registros</div>';
    return;
  }

  a.history.forEach(h=>{
    box.innerHTML += `
      <div class="history-item">
        <strong>${h.desc}</strong>
        <div class="muted">${h.date} → ${h.next||'—'}</div>
      </div>
    `;
  });
}

// ===============================
// 🔔 ALERTAS (FECHA NEXT)
// ===============================
function renderAlerts(){
  const box = document.getElementById('alertsBox');
  box.innerHTML = '';

  const now = new Date();

  const alerts = [];
  apiladoras.forEach(a=>{
    (a.history||[]).forEach(h=>{
      if(h.next){
        const d = new Date(h.next+'T00:00');
        const diff = Math.ceil((d-now)/(1000*60*60*24));
        if(diff >= 0 && diff <= 30){
          alerts.push({a,h,diff});
        }
      }
    });
  });

  if(!alerts.length){
    box.innerHTML = '<div class="muted">No hay alertas</div>';
    return;
  }

  alerts.sort((x,y)=>x.diff-y.diff).slice(0,8).forEach(x=>{
    box.innerHTML += `
      <div class="alert-item">
        <div>
          <strong>${x.a.name}</strong>
          <div class="muted">${x.h.desc} — ${x.h.next}</div>
        </div>
        <div class="pill">${x.diff}d</div>
      </div>
    `;
  });
}

// ===============================
btnNew.onclick = addApiladora;
btnAddMaint.onclick = addMaintenance;
globalSearch.oninput = e => renderList(e.target.value);
histSearch.oninput = renderHistory;

