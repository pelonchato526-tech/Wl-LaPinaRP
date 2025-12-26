// Formulario paso a paso con barra de progreso
const formContainer = document.getElementById('form-container');
if(formContainer){
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

  let current = 0;
  const respuestas = [];
  const discordId = document.getElementById('formulario').dataset.discordid;
  const timerEl = document.getElementById('timer');
  let tiempo = 900;
  let timerInterval = setInterval(()=>{
    if(tiempo<=0){ clearInterval(timerInterval); formContainer.innerHTML="<p>⏰ Tiempo expirado</p>"; return; }
    let min = Math.floor(tiempo/60);
    let sec = tiempo%60;
    timerEl.innerText = "Tiempo restante: "+min.toString().padStart(2,'0')+":"+sec.toString().padStart(2,'0');
    tiempo--;
  },1000);

  const startBtn = document.getElementById('startBtn');
  startBtn.onclick = ()=> showPregunta();

  function showPregunta(){
    const progress = Math.floor(current/preguntas.length*100);
    formContainer.innerHTML = `
      <div id="progress-bar" style="height:10px;width:100%;background:#222;border-radius:5px;margin-bottom:10px;">
        <div style="height:10px;width:${progress}%;background:linear-gradient(90deg,#FFD700,#e6c200);border-radius:5px;"></div>
      </div>
      <div>${preguntas[current]}</div>
      <input type="text" id="answer"/>
      <button id="nextBtn">Listo</button>
    `;
    document.getElementById('nextBtn').onclick = ()=>{
      const val = document.getElementById('answer').value.trim();
      if(!val){ alert("Debes responder"); return; }
      respuestas.push(val);
      current++;
      if(current<preguntas.length) showPregunta();
      else enviarWL();
    };
  }

  async function enviarWL(){
    formContainer.innerHTML="<p>Enviando WL...</p>";
    clearInterval(timerInterval);
    const res = await fetch('/wl-form',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({discordId,respuestas})
    });
    const data = await res.json();
    formContainer.innerHTML = `<p>${data.status==='ok'?'✅ WL enviada con éxito!':'❌ Error al enviar'}</p>`;
  }
}
