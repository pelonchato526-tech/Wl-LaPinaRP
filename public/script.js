const urlParams = new URLSearchParams(window.location.search);
const discordId = urlParams.get('discordId');
const username = urlParams.get('username');

if(!discordId || !username){
  window.location.href = '/';
}

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
  "¿Qué significa 'Valorar la vida'?"
];

let index = 0;
const respuestas = [];
let tiempo = 900;
const app = document.getElementById('app');

function startForm(){
  app.innerHTML = `
    <img src="/logo.png" class="logo">
    <h1>WL Formulario - ${username}</h1>
    <div id="timer">Tiempo restante: 15:00</div>
    <div id="progress-bar"></div>
    <div id="question-container">
      <p id="question">${preguntas[index]}</p>
      <textarea id="answer" placeholder="Escribe tu respuesta..."></textarea>
      <button class="btn" id="nextBtn">Siguiente</button>
    </div>
  `;
  iniciarTimer();
  document.getElementById('nextBtn').onclick = siguientePregunta;
}

function iniciarTimer(){
  const timerEl = document.getElementById('timer');
  const interval = setInterval(()=>{
    tiempo--;
    const m = String(Math.floor(tiempo/60)).padStart(2,'0');
    const s = String(tiempo%60).padStart(2,'0');
    timerEl.innerText = `Tiempo restante: ${m}:${s}`;
    if(tiempo<=0){ clearInterval(interval); app.innerHTML="<h1>⏰ Tiempo agotado</h1>"; }
  },1000);
}

function siguientePregunta(){
  const val = document.getElementById('answer').value.trim();
  if(!val){ alert("Debes responder"); return; }
  respuestas.push(val);
  index++;
  if(index < preguntas.length){
    document.getElementById('question').innerText = preguntas[index];
    document.getElementById('answer').value = "";
  } else {
    enviarWL();
  }
}

async function enviarWL(){
  app.innerHTML = "<h1>Enviando WL...</h1>";
  const res = await fetch('/wl-form',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({discordId,respuestas})
  });
  const data = await res.json();
  app.innerHTML = `<h1>${data.status==='ok'?'✅ WL enviada correctamente':'❌ Error'}</h1>`;
}

startForm();
