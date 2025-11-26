// All functionality preserved, without export or delete features.
const STORAGE_KEY = 'rs_apiladoras_v1';
let apiladoras = [];
let selectedId = null;

// Utils
const uid = () => 'id-'+Math.random().toString(36).slice(2,9);
const today = () => new Date().toISOString().slice(0,10);

// Load / Save
function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(raw){ try{ apiladoras = JSON.parse(raw); }catch(e){ apiladoras = [] }}
  renderList();
  renderAlerts();
  document.getElementById('lastSync').innerText = new Date().toLocaleString();
}
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apiladoras));
  renderList(); renderAlerts();
  document.getElementById('lastSync').innerText = new Date().toLocaleString();
}

// 🔥 NUEVA FUNCIÓN — Eliminar Apiladora
function eliminarApiladora(id){
  if(!confirm("¿Seguro que deseas eliminar esta apiladora?")) return;
  apiladoras = apiladoras.filter(a => a.id !== id);

  // Si eliminas la seleccionada
  if(selectedId === id){
    selectedId = null;
    document.getElementById('apDetails').style.display='none';
    document.getElementById('emptyState').style.display='block';
  }

  save();
}

// Render list
function renderList(filter=''){
  const container = document.getElementById('apList');
  container.innerHTML='';
  let filtered = apiladoras;
  if(filter){
    const q = filter.toLowerCase();
    filtered = apiladoras.filter(a => (a.name||'').toLowerCase().includes(q) || (a.code||'').toLowerCase().includes(q));
  }
  document.getElementById('totalCount').innerText = filtered.length;
  if(filtered.length===0){
    container.innerHTML = '<div class="muted">No hay apiladoras. Crea una con "Nuevo".</div>';
    return;
  }

  filtered.forEach(a => {
    const el = document.createElement('div');
    el.className='ap-item';
    el.dataset.id = a.id;

    // 🔥 Botón eliminar agregado SIN tocar estilos existentes
    const deleteBtn = `
      <button 
        onclick="event.stopPropagation(); eliminarApiladora('${a.id}')"
        style="
          background: none;
          border: 1px solid var(--gold-dark);
          color: var(--gold-dark);
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 11px;
          cursor: pointer;
        ">
        Eliminar
      </button>
    `;

    el.innerHTML = `
      <div>
        <strong>${a.name}</strong>
        <div class="meta">${a.code||'—'}</div>
      </div>
      <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-end;">
        <div class="muted">${a.history?.length||0} registros</div>
        ${deleteBtn}
      </div>
    `;

    el.onclick = ()=> selectApiladora(a.id);
    container.appendChild(el);
  });
}

// Alerts
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

// Select apiladora
function selectApiladora(id){
  selectedId = id;
  const a = apiladoras.find(x=>x.id===id);
  if(!a) return;
  document.getElementById('emptyState').style.display='none';
  document.getElementById('apDetails').style.display='block';
  document.getElementById('apName').innerText = a.name;
  document.getElementById('apCode').innerText = 'Código: ' + (a.code||'—');
  document.getElementById('nextMaint').innerText = getNextFor(a) || '—';
  renderHistory();
}

function getNextFor(a){
  const future = (a.history||[]).filter(h=>h.next).map(h=>h.next).sort();
  return future.length? future[0] : '';
}

// Add apiladora
function addApiladora(){
  const name = prompt('Nombre de la apiladora (ej. AP-125):');
  if(!name) return;
  const code = prompt('Código o placa (opcional):');
  const obj = {id:uid(), name, code:code||'', history:[]};
  apiladoras.push(obj); 
  save(); 
  selectApiladora(obj.id);
}

// Add maintenance
function addMaintenance(){
  if(!selectedId) return alert('Selecciona una apiladora primero.');
  const desc = document.getElementById('mDesc').value.trim();
  const date = document.getElementById('mDate').value || today();
  const next = document.getElementById('mNext').value || '';
  if(!desc) return alert('Describe el mantenimiento.');
  const a = apiladoras.find(x=>x.id===selectedId);
  const entry = {id:uid(), desc, date, next};
  a.history = a.history||[]; 
  a.history.unshift(entry);
  save(); 
  selectApiladora(a.id);

  if(next){
    const now = new Date(); 
    const nd = new Date(next+'T00:00:00');
    if(nd <= now){ alert('Atención: hay un mantenimiento programado para hoy o fecha pasada.'); }
  }

  document.getElementById('mDesc').value='';
  document.getElementById('mDate').value='';
  document.getElementById('mNext').value='';
}

function renderHistory(filter=''){
  const list = document.getElementById('history'); 
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

// Search handlers
document.addEventListener('DOMContentLoaded', function(){
  document.getElementById('globalSearch').addEventListener('input', e=> renderList(e.target.value));
  document.getElementById('btnNew').addEventListener('click', addApiladora);
  document.getElementById('btnAddMaint').addEventListener('click', addMaintenance);
  document.getElementById('histSearch').addEventListener('input', e=> renderHistory(e.target.value));
  
  document.getElementById('btnFilterDate').addEventListener('click', ()=>{
    const d = document.getElementById('filterDate').value;
    if(!d) return load();
    const matching = apiladoras.filter(a => (a.history||[]).some(h=>h.date===d));
    const container = document.getElementById('apList'); 
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
    document.getElementById('totalCount').innerText = matching.length;
  });

  document.getElementById('btnClear').addEventListener('click', ()=>{
    document.getElementById('filterDate').value='';
    load();
  });

  // 🔥 YA NO SE CREAN APILADORAS AUTOMÁTICAS
  load(); 
  // ensureDemo();   ← DESACTIVADO
  notifyUpcoming();
});

// Demo data eliminado
function ensureDemo(){
  // vacío para evitar creación automática
}

// Notify on load
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

// expose
window._rs = {load, save, apiladoras};
