const preguntas=[
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
"¿Qué significa Valorar la vida"
];

let index=0,respuestas=[],tiempo=15*60,timerInterval;
const app=document.getElementById("app");

function pantallaInicio(){mostrarPregunta();}
function iniciarTimer(){
timerInterval=setInterval(()=>{
tiempo--;
const min=String(Math.floor(tiempo/60)).padStart(2,'0');
const sec=String(tiempo%60).padStart(2,'0');
document.getElementById("timer").innerText=`⏳ Tiempo restante: ${min}:${sec}`;
if(tiempo<=0){clearInterval(timerInterval);app.innerHTML="<h1>⛔ Tiempo agotado</h1>";}
},1000);
}

function mostrarPregunta(){
if(index===0)iniciarTimer();
app.innerHTML=`
<div class="timer" id="timer"></div>
<div class="progress">${Math.round((index/preguntas.length)*100)}%</div>
<div class="question">${preguntas[index]}</div>
<textarea id="respuesta" placeholder="Escribe tu respuesta..."></textarea>
<button class="btn" onclick="siguiente()">Siguiente</button>
`;
}

function siguiente(){
const val=document.getElementById("respuesta").value.trim();
if(!val)return alert("Debes responder la pregunta");
respuestas.push(val);
index++;
if(index<preguntas.length)mostrarPregunta();
else enviarWL();
}

async function enviarWL(){
clearInterval(timerInterval);
app.innerHTML="<h1>📨 Enviando WL...</h1>";
await fetch("/wl-form",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({respuestas})});
app.innerHTML="<h1>✅ WL enviada correctamente</h1>";
}

pantallaInicio();
