// -----------------------------
// script.js (completo, Firebase)
// Reemplaza tu script.js anterior por este.
// RECUERDA: cargar en index.html como: <script type="module" src="script.js"></script>
// -----------------------------

// Import Firebase (modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// -----------------------------
// Configuración Firebase
// (YA la tienes; si quieres cambiarla, edítala aquí)
// -----------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBuMq5dYodQyQr70lggbbcat11kBcrwIcg",
  authDomain: "ricardoapiladoras.firebaseapp.com",
  projectId: "ricardoapiladoras",
  storageBucket: "ricardoapiladoras.firebasestorage.app",
  messagingSenderId: "602687404564",
  appId: "1:602687404564:web:7da62714ed54d7419dc501"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "apiladoras");

// -----------------------------
// Estado local (se mantiene como antes)
// -----------------------------
const STORAGE_KEY = 'rs_apiladoras_v1'; // mantenemos la key por compatibilidad (no usado para persistencia principal)
let apiladoras = []; // esta lista se sincroniza desde Firestore
let selectedId = null;

// Utils
const uid = () => 'id-'+Math.random().toString(36).slice(2,9);
const today = () => new Date().toISOString().slice(0,10);

// -----------------------------
// Load/Save (ahora con Firestore)
// - load() sólo renderiza a partir del array 'apiladoras'
// - la persistencia se hace sobre Firestore en cada operación
// -----------------------------
function load(){
  // renderList() y renderAlerts() usan el array apiladoras que actualiza onSnapshot
  renderList();
  renderAlerts();
  const el = document.getElementById('lastSync');
  if(el) el.innerText = new Date().toLocaleString();
}
function save(){ // en este diseño save() solo re-renderiza (las operaciones individuales escriben en Firestore)
  renderList();
  renderAlerts();
  const el = document.getElementById('lastSync');
  if(el) el.innerText = new Date().toLocaleString();
}

// -----------------------------
// Firestore: escuchar cambios en tiempo real
// Esto mantiene 'apiladoras' actualizado automáticamente
// -----------------------------
function startRealtimeListener(){
  // ordenar por nombre para consistencia visual (puedes cambiar)
  const q = query(colRef, orderBy("name"));
  onSnapshot(q, (snapshot) => {
    const arr = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      // Estructura esperada: { name, code, history: [...] }
      arr.push({
        id: docSnap.id,
        name: data.name || data.nombre || 'Sin nombre',
        code: data.code || data.codigo || data.code || '',
        history: Array.isArray(data.history) ? data.history : (Array.isArray(data.hist) ? data.hist : [])
      });
    });
    apiladoras = arr;
    // Re-render
    load();
    // Si hay una apiladora seleccionada, asegurarnos de actualizar el panel derecho
    if(selectedId){
      const exists = apiladoras.find(a=>a.id===selectedId);
      if(!exists){
        // si fue borrada remotamente, cerrar panel
        selectedId = null;
        const details = document.getElementById('apDetails');
        const emptyS = document.getElementById('emptyState');
        if(details) details.style.display='none';
        if(emptyS) emptyS.style.display='block';
      } else {
        // actualizar datos en panel
        selectApiladora(selectedId);
      }
    }
  }, (err)=>{
    console.error("Realtime Firestore error:", err);
    // fallback: intentar una carga inicial (no destructiva)
    inicialLoadOnce();
  });
}

// Si onSnapshot falla por permisos, hacemos una carga simple inicial
async function inicialLoadOnce(){
  try {
    const snap = await getDocs(colRef);
    const arr = [];
    snap.forEach(d=>{
      const data = d.data();
      arr.push({
        id: d.id,
        name: data.name || data.nombre || 'Sin nombre',
        code: data.code || data.codigo || '',
        history: Array.isArray(data.history) ? data.history : []
      });
    });
    apiladoras = arr;
    load();
  } catch(e){
    console.error("Error cargando desde Firestore:", e);
    apiladoras = []; load();
  }
}

// -----------------------------
// Helper: guardar/actualizar documento completo en Firestore
// -----------------------------
async function setApiladoraRemote(ap){ // ap: {id?, name, code, history}
  if(!ap) return;
  try {
    if(ap.id){
      // usar setDoc para sobrescribir (mantener formato)
      const ref = doc(db, "apiladoras", ap.id);
      await setDoc(ref, {
        name: ap.name,
        code: ap.code || '',
        history: ap.history || []
      }, { merge: true });
    } else {
      // crear nuevo doc con addDoc
      const newRef = await addDoc(colRef, { name: ap.name, code: ap.code||'', history: ap.history||[] });
      ap.id = newRef.id;
    }
  } catch(e){
    console.error("Error guardando apiladora en Firestore:", e);
    alert("Error al guardar en la nube. Ver consola.");
  }
}

async function deleteApiladoraRemote(id){
  try {
    const ref = doc(db, "apiladoras", id);
    await deleteDoc(ref);
  } catch(e){
    console.error("Error eliminando en Firestore:", e);
    alert("Error al eliminar en la nube. Ver consola.");
  }
}

async function updateApiladoraRemote(id, patch){ // patch: {history: [...] } u otros
  try {
    const ref = doc(db, "apiladoras", id);
    await updateDoc(ref, patch);
  } catch(e){
    // fallback a setDoc si update falla
    try {
      const ref2 = doc(db, "apiladoras", id);
      await setDoc(ref2, patch, { merge: true });
    } catch(e2){
      console.error("Error actualizando apiladora remote:", e2);
      alert("Error al actualizar en la nube. Ver consola.");
    }
  }
}

// -----------------------------
// Render list (con botón Eliminar por item)
// -----------------------------
function renderList(filter=''){
  const container = document.getElementById('apList');
  if(!container) return;
  container.innerHTML='';
  let filtered = apiladoras;
  if(filter){
    const q = filter.toLowerCase();
    filtered = apiladoras.filter(a => (a.name||'').toLowerCase().includes(q) || (a.code||'').toLowerCase().includes(q));
  }
  const totalEl = document.getElementById('totalCount');
  if(totalEl) totalEl.innerText = filtered.length;

  if(filtered.length===0){
    container.innerHTML = '<div class="muted">No hay apiladoras. Crea una con "Nuevo".</div>';
    return;
  }

  filtered.forEach(a => {
    const el = document.createElement('div');
    el.className='ap-item';
    el.dataset.id = a.id;

    // Botón eliminar (estilo coherente con tu CSS)
    const deleteBtn = document.createElement('button');
    deleteBtn.innerText = 'Eliminar';
    deleteBtn.style.background = 'none';
    deleteBtn.style.border = '1px solid var(--gold-dark)';
    deleteBtn.style.color = 'var(--gold-dark)';
    deleteBtn.style.padding = '4px 8px';
    deleteBtn.style.borderRadius = '8px';
    deleteBtn.style.fontSize = '11px';
    deleteBtn.style.cursor = 'pointer';

    // estructura interna
    const left = document.createElement('div');
    left.innerHTML = `<strong>${a.name}</strong><div class="meta">${a.code||'—'}</div>`;

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.flexDirection = 'column';
    right.style.gap = '4px';
    right.style.alignItems = 'flex-end';

    const registros = document.createElement('div');
    registros.className = 'muted';
    registros.innerText = `${a.history?.length||0} registros`;

    right.appendChild(registros);
    right.appendChild(deleteBtn);

    el.appendChild(left);
    el.appendChild(right);

    // click sobre el elemento para seleccionar (excepto eliminar)
    el.addEventListener('click', ()=> selectApiladora(a.id));
    deleteBtn.addEventListener('click', async (ev)=>{
      ev.stopPropagation();
      if(!confirm(`¿Eliminar la apiladora "${a.name}" y todo su historial? Esta acción no se puede deshacer.`)) return;
      // eliminar remoto
      await deleteApiladoraRemote(a.id);
      // el onSnapshot actualizará la UI automáticamente
    });

    container.appendChild(el);
  });
}

// -----------------------------
// Alerts
// -----------------------------
function getUpcoming(days=30){
  const now = new Date();
  const out = [];
  apiladoras.forEach(a => {
    (a.history||[]).forEach(h => {
      if(h.next && h.next !== ''){
        const d = new Date(h.next+'T00:00:00');
        const diff = Math.ceil((d - now)/(1000*60*60*24));
        if(diff <= days){ out.push({ap:a,entry:h,days:diff}); }
      }
    })
  });
  out.sort((x,y)=> x.days - y.days);
  return out;
}

function renderAlerts(){
  const box = document.getElementById('alertsBox');
  if(!box) return;
  const upcoming = getUpcoming(365);
  if(upcoming.length===0){
    box.innerHTML='<div class="muted" style="padding:8px">No hay alertas</div>';
    return;
  }
  box.innerHTML='';
  upcoming.slice(0,8).forEach(it=>{
    const el = document.createElement('div'); 
    el.className='alert-item';
    el.innerHTML = `
      <div>
        <strong>${it.ap.name}</strong>
        <div class="muted">${it.entry.desc||'Mantenimiento'} — ${it.entry.next}</div>
      </div>
      <div class="pill">${it.days}d</div>`;
    box.appendChild(el);
  });
}

// -----------------------------
// Select apiladora & History
// -----------------------------
function selectApiladora(id){
  selectedId = id;
  const a = apiladoras.find(x=>x.id===id);
  if(!a) return;
  const emptyState = document.getElementById('emptyState');
  const details = document.getElementById('apDetails');
  if(emptyState) emptyState.style.display='none';
  if(details) details.style.display='block';
  document.getElementById('apName').innerText = a.name;
  document.getElementById('apCode').innerText = 'Código: ' + (a.code||'—');
  document.getElementById('nextMaint').innerText = getNextFor(a) || '—';
  renderHistory();
}

function getNextFor(a){
  const future = (a.history||[]).filter(h=>h.next).map(h=>h.next).sort();
  return future.length? future[0] : '';
}

// -----------------------------
// Add apiladora (crea documento en Firestore)
// -----------------------------
async function addApiladora(){
  const name = prompt('Nombre de la apiladora (ej. AP-125):');
  if(!name) return;
  const code = prompt('Código o placa (opcional):');
  // crear en Firestore
  try {
    const docRef = await addDoc(colRef, { name, code: code||'', history: [] });
    // onSnapshot la incluirá automáticamente en la lista
    // seleccionar la nueva (esperamos un poco a que llegue)
    setTimeout(()=> selectApiladora(docRef.id), 400);
  } catch(e){
    console.error("Error creando apiladora:", e);
    alert("No se pudo crear la apiladora en la nube.");
  }
}

// -----------------------------
// Add maintenance: actualizar documento remoto (push al inicio del array)
// -----------------------------
async function addMaintenance(){
  if(!selectedId) return alert('Selecciona una apiladora primero.');
  const desc = document.getElementById('mDesc').value.trim();
  const date = document.getElementById('mDate').value || today();
  const next = document.getElementById('mNext').value || '';
  if(!desc) return alert('Describe el mantenimiento.');

  const aIndex = apiladoras.findIndex(x=>x.id===selectedId);
  if(aIndex === -1) return alert('Apiladora no encontrada.');

  // crear la entrada localmente
  const entry = { id: uid(), desc, date, next };
  const a = apiladoras[aIndex];
  a.history = a.history||[];
  a.history.unshift(entry);

  // actualizar remoto (reemplazamos todo el history)
  try {
    await updateApiladoraHistoryRemote(selectedId, a.history);
    // limpiar inputs y re-render (onSnapshot se encargará pero forzamos)
    document.getElementById('mDesc').value=''; document.getElementById('mDate').value=''; document.getElementById('mNext').value='';
    // seleccionar apiladora para actualizar panel
    selectApiladora(selectedId);
    // si next es hoy o pasado, alertar
    if(next){
      const now = new Date(); const nd = new Date(next+'T00:00:00');
      if(nd <= now){ alert('Atención: hay un mantenimiento programado para hoy o fecha pasada.'); }
    }
  } catch(e){
    console.error("Error guardando mantenimiento:", e);
    alert("No se pudo guardar el mantenimiento en la nube.");
  }
}

async function updateApiladoraHistoryRemote(id, historyArr){
  // write full history array to remote
  await updateApiladoraRemote(id, { history: historyArr });
}

// -----------------------------
// Renderizar historial
// -----------------------------
function renderHistory(filter=''){
  const list = document.getElementById('history'); 
  if(!list) return;
  list.innerHTML='';
  const a = apiladoras.find(x=>x.id===selectedId);
  if(!a) return;
  let items = a.history || [];
  if(filter){
    const q=filter.toLowerCase();
    items = items.filter(it => (it.desc||'').toLowerCase().includes(q) || (it.date||'').includes(q) );
  }
  if(items.length===0){
    list.innerHTML='<div class="muted">Sin historial aún</div>';
    return;
  }
  items.forEach(it=>{
    const div = document.createElement('div'); 
    div.className='history-item';
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between">
        <div>
          <strong>${it.desc}</strong>
          <div class='muted'>Fecha: ${it.date}</div>
        </div>
        <div style='text-align:right'>
          <div class='muted'>Próx:</div>
          <div>${it.next||'—'}</div>
        </div>
      </div>`;
    list.appendChild(div);
  });
}

// -----------------------------
// Search handlers y listeners
// -----------------------------
document.addEventListener('DOMContentLoaded', function(){
  // buscadores, botones y eventos (igual que tu código original)
  const globalSearch = document.getElementById('globalSearch');
  if(globalSearch) globalSearch.addEventListener('input', e=> renderList(e.target.value));
  const btnNew = document.getElementById('btnNew');
  if(btnNew) btnNew.addEventListener('click', addApiladora);
  const btnAddMaint = document.getElementById('btnAddMaint');
  if(btnAddMaint) btnAddMaint.addEventListener('click', addMaintenance);
  const histSearch = document.getElementById('histSearch');
  if(histSearch) histSearch.addEventListener('input', e=> renderHistory(e.target.value));

  const btnFilterDate = document.getElementById('btnFilterDate');
  if(btnFilterDate) btnFilterDate.addEventListener('click', ()=>{
    const d = document.getElementById('filterDate').value;
    if(!d) return load();
    const matching = apiladoras.filter(a => (a.history||[]).some(h=>h.date===d));
    const container = document.getElementById('apList'); 
    if(!container) return;
    container.innerHTML='';
    matching.forEach(a=>{
      const el = document.createElement('div'); 
      el.className='ap-item'; el.dataset.id = a.id;
      el.innerHTML = `
        <div>
          <strong>${a.name}</strong>
          <div class="meta">${a.code||'—'}</div>
        </div>
        <div class="muted">
          ${a.history?.filter(h=>h.date===d).length} en ${d}
        </div>`;
      el.onclick = ()=> selectApiladora(a.id);
      container.appendChild(el);
    });
    const totalCountEl = document.getElementById('totalCount');
    if(totalCountEl) totalCountEl.innerText = matching.length;
  });

  const btnClear = document.getElementById('btnClear');
  if(btnClear) btnClear.addEventListener('click', ()=>{
    const fd = document.getElementById('filterDate');
    if(fd) fd.value='';
    load();
  });

  // menu buttons
  document.querySelectorAll('.menu button').forEach(b=> b.addEventListener('click', ()=>{
    document.querySelectorAll('.menu button').forEach(x=>x.classList.remove('active')); b.classList.add('active');
    const v = b.dataset.view;
    if(v==='alerts'){
      const box = document.getElementById('alertsBox'); if(box) box.scrollIntoView({behavior:'smooth'});
    }
  }));

  // Start realtime listener (this will call load() after first snapshot)
  startRealtimeListener();

  // notifyUpcoming will run after initial data arrives (onSnapshot triggers load->renderAlerts)
});

// -----------------------------
// ensureDemo: lo dejamos vacío (sin datos demo)
// -----------------------------
function ensureDemo(){
  // Intencionalmente vacío para evitar datos por defecto
}

// -----------------------------
// notifyUpcoming
// -----------------------------
function notifyUpcoming(){
  const upcoming = getUpcoming(7);
  if(upcoming.length>0){
    const names = upcoming
      .map(u => `${u.ap.name} (${u.entry.next})`)
      .slice(0,6)
      .join('\n');
    alert('Aviso: hay ' + upcoming.length + ' mantenimiento(s) próximos dentro de 7 días:\n' + names);
  }
}

// -----------------------------
// expose for debugging (igual que antes)
// -----------------------------
window._rs = { load, save, apiladoras };


