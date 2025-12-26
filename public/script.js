const preguntas = [
  "¿Qué es el MetaGaming (MG)?",
  "Si mueres y reapareces en el hospital (PK), ¿qué debes hacer?",
  "¿Qué es el PowerGaming (PG)?",
  "Te están atracando con un arma en la cabeza. ¿Cómo actúas?",
  "¿Qué significa OOC (Out Of Character)?",
  "¿Qué es el VDM (Vehicle Deathmatch)?",
  "¿Cuál es el procedimiento si ves a alguien incumpliendo las normas?",
  "¿Qué es el Combat Logging?",
  "¿Qué es el Bunny Jump?",
  "¿Está permitido hablar de temas de la vida real por el chat de voz?",
  "¿Qué es el RDM (Random Deathmatch)?",
  "¿Qué significa valorar la vida?"
];

let index = 0;
let respuestas = [];
let tiempo = 900;
let timerInterval;
let hasFocus = true;

// Comprobar si ya envió WL
const discordId = sessionStorage.getItem('discordId');
const wlEnviada = sessionStorage.getItem('wlEnviada');

if(wlEnviada){
  document.getElementById('app').innerHTML = "<h1>✅ Ya enviaste tu WL</h1>";
} else {
  startForm();
}

function startForm(){
  const app = document.getElementById('app');
  app.innerHTML = `
    <img src="/logo.png" class="logo">
    <h1>Formulario WL</h1>
    <div id="timer">Tiempo restante: 15:00</div>
    <div id="form-container">
      <p>Presiona "Comenzar" para iniciar la WL</p>
      <button id="startBtn" class="btn">Comenzar</button>
      <div class="progress-bar" style="height:10px; width:100%; background:#333; border-radius:5px; margin-top:15px;">
        <div id="progress" style="height:100%; width:0%; background: linear-gradient(90deg,#FFD700,#FFA500); border-radius:5px;"></div>
      </div>
    </div>
  `;

  document.getElementById('startBtn').onclick = ()=>{ showQuestion(); startTimer(); };
}

// Mostrar pregunta
function showQuestion(){
  const app = document.getElementById('form-container');
  app.innerHTML = `
    <div id="question">${preguntas[index]}</div>
    <textarea id="answer" placeholder="Escribe tu respuesta..."></textarea>
    <button id="nextBtn" class="btn">Siguiente</button>
  `;
  document.getElementById('nextBtn').onclick = nextQuestion;
}

// Siguiente pregunta
function nextQuestion(){
  const val = document.getElementById('answer').value.trim();
  if(!val) return alert("Debes responder la pregunta");
  respuestas.push(val);
  index++;
  document.getElementById('progress').style.width = `${Math.floor((index/preguntas.length)*100)}%`;
  if(index < preguntas.length){
    showQuestion();
  } else {
    enviarWL();
  }
}

// Timer y cancelación si cambia pestaña
function startTimer(){
  timerInterval = setInterval(()=>{
    if(!hasFocus){
      clearInterval(timerInterval);
      alert("⛔ Cambiaste de pestaña, WL cancelada");
      location.reload();
    }
    tiempo--;
    const min = String(Math.floor(tiempo/60)).padStart(2,'0');
    const sec = String(tiempo%60).padStart(2,'0');
    document.getElementById('timer').innerText = `⏳ Tiempo restante: ${min}:${sec}`;
    if(tiempo <= 0){
      clearInterval(timerInterval);
      alert("⏰ Tiempo agotado");
      location.reload();
    }
  },1000);
}

window.onblur = ()=>{ hasFocus=false; };
window.onfocus = ()=>{ hasFocus=true; };

// Enviar WL
async function enviarWL(){
  clearInterval(timerInterval);
  const app = document.getElementById('form-container');
  app.innerHTML = "<p>Enviando WL...</p>";
  const res = await fetch('/wl-form',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({discordId,respuestas})
  });
  const data = await res.json();
  if(data.status==='ok'){
    sessionStorage.setItem('wlEnviada',true);
    app.innerHTML = "<h1>✅ WL enviada correctamente</h1>";
  } else {
    app.innerHTML = "<h1>❌ Error al enviar WL</h1>";
  }
}
