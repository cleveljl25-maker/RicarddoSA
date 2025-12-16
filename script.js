// 🔥 FIREBASE (usa tus credenciales)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ⛔ NO CAMBIES LA ESTRUCTURA, SOLO TUS DATOS
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
const colApiladoras = collection(db, "apiladoras");

// ESTADO
let apiladoras = [];

// REFERENCIAS
const lista = document.getElementById("listaApiladoras");
const total = document.getElementById("totalApiladoras");

// ESCUCHA EN TIEMPO REAL
onSnapshot(colApiladoras, (snapshot) => {
  apiladoras = [];
  snapshot.forEach(doc => {
    apiladoras.push({ id: doc.id, ...doc.data() });
  });
  render();
});

// UI
window.abrirModal = () => {
  document.getElementById("modalApiladora").classList.remove("hidden");
};

window.cerrarModal = () => {
  document.getElementById("modalApiladora").classList.add("hidden");
  document.getElementById("nombreApiladora").value = "";
};

// GUARDAR
window.guardarApiladora = async () => {
  const nombre = document.getElementById("nombreApiladora").value.trim();
  if (!nombre) {
    alert("Ingrese el nombre de la apiladora");
    return;
  }

  await addDoc(colApiladoras, {
    nombre,
    creada: new Date()
  });

  cerrarModal();
};

// RENDER
function render() {
  lista.innerHTML = "";
  total.textContent = apiladoras.length;

  apiladoras.forEach(a => {
    const div = document.createElement("div");
    div.className = "apiladora-item";
    div.innerHTML = `<strong>${a.nombre}</strong>`;
    lista.appendChild(div);
  });
}
