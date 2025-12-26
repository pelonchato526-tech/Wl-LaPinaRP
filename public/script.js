const app = document.getElementById("app");

let index = 0;
let respuestas = [];
let tiempo = 900; // 15 min
let timerInterval;

// Función para mostrar la pantalla de inicio
function pantallaInicio() {
  app.innerHTML = `
    <div class="card">
      <img src="/logo.png" class="logo">
      <h1>La Piña RP</h1>
      <div class="subtitle">Sistema Oficial de Whitelist</div>
      <div class="instructions">
        • Lee cuidadosamente cada pregunta.<br>
        • Tienes <b>15 minutos</b> para completar la WL.<br>
        • No podrás editar respuestas.<br>
        • Solo puedes enviar la WL <b>una vez</b>.
      </div>
      <a href="/callback"><button class="btn">Conectar con Discord y Comenzar</button></a>
      <div class="footer">© 2025 La Piña RP</div>
    </div>
  `;
}

// Bloqueo si cambia de pestaña o refresh
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    alert("❌ WL cancelada por cambiar de pestaña");
    window.location.href = "/";
  }
});
window.addEventListener("beforeunload", (e) => {
  e.preventDefault();
  e.returnValue = "";
});

// Función para mostrar preguntas
function mostrarPregunta() {
  if (index === 0) iniciarTimer();

  app.innerHTML = `
    <div class="card">
      <img src="/logo.png" class="logo">
      <div class="timer" id="timer">⏳ Tiempo restante: 15:00</div>
      <div class="progress-container"><div class="progress-bar" id="progressBar"></div></div>
      <div class="question" id="question"></div>
      <textarea id="respuesta"></textarea>
      <button class="btn" id="nextBtn">Siguiente</button>
      <div class="footer">© La Piña RP</div>
    </div>
  `;

  const questionEl = document.getElementById("question");
  const progressBar = document.getElementById("progressBar");
  questionEl.innerText = preguntas[index];
  progressBar.style.width = `${(index / preguntas.length) * 100}%`;

  document.getElementById("nextBtn").onclick = () => {
    const val = document.getElementById("respuesta").value.trim();
    if (!val) return alert("Debes responder la pregunta");
    respuestas.push(val);
    index++;
    if (index < preguntas.length) {
      mostrarPregunta();
    } else {
      enviarWL();
    }
  };
}

// Contador
function iniciarTimer() {
  const timerEl = document.getElementById("timer");
  timerInterval = setInterval(() => {
    tiempo--;
    const min = String(Math.floor(tiempo / 60)).padStart(2, "0");
    const sec = String(tiempo % 60).padStart(2, "0");
    timerEl.innerText = `⏳ Tiempo restante: ${min}:${sec}`;
    if (tiempo <= 0) {
      clearInterval(timerInterval);
      app.innerHTML = `<div class="card"><h1>⛔ Tiempo agotado</h1></div>`;
    }
  }, 1000);
}

// Función para enviar WL al backend
async function enviarWL() {
  clearInterval(timerInterval);
  app.innerHTML = `<div class="card"><h1>📨 Enviando WL...</h1></div>`;
  try {
    const res = await fetch("/wl-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ respuestas }),
    });
    const data = await res.json();

    if (data.status === "ok") {
      app.innerHTML = `<div class="card"><h1>✅ WL enviada correctamente</h1></div>`;
    } else if (data.status === "already") {
      // Mostrar estado actual de la WL si ya fue procesada
      app.innerHTML = `
        <div class="card">
          <img src="/logo.png" class="logo">
          <h1>WL ya completada</h1>
          <p>Estado: <b>${data.result}</b></p>
          <img src="${data.gif}" style="width:200px;margin-top:15px;"/>
          <div class="footer">© 2025 La Piña RP</div>
        </div>
      `;
    } else {
      app.innerHTML = `<div class="card"><h1>❌ Error al enviar WL</h1></div>`;
    }
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="card"><h1>❌ Error interno</h1></div>`;
  }
}

// --- Cargar pantalla de inicio ---
pantallaInicio();
