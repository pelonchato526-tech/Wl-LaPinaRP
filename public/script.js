const QUESTIONS = [
  "1. ¿Qué es el MetaGaming (MG)?",
  "2. Si mueres y reapareces en el hospital (PK), ¿qué debes hacer?",
  "3. ¿Qué es el PowerGaming (PG)?",
  "4. Te están atracando con un arma en la cabeza. ¿Cómo actúas?",
  "5. ¿Qué significa OOC (Out Of Character)?",
  "6. ¿Qué es el VDM (Vehicle Deathmatch)?",
  "7. ¿Cuál es el procedimiento si ves a alguien incumpliendo las normas?",
  "8. ¿Qué es el Combat Logging?",
  "9. ¿Qué es el Bunny Jump?",
  "10. ¿Está permitido hablar de temas de la vida real (fútbol, política, clima real) por el chat de voz del juego?",
  "11. ¿Qué es el RDM (Random Deathmatch)?",
  "12. ¿Qué significa \"Valorar la vida\""
];

const container = document.getElementById("questionsContainer");
QUESTIONS.forEach((q, i) => {
  const div = document.createElement("div");
  div.innerHTML = `<label>${q}</label><textarea name="q${i+1}" required></textarea>`;
  container.appendChild(div);
});

// Temporizador 10 minutos
let timeLeft = 600;
const timerEl = document.getElementById("timer");
const timerInterval = setInterval(() => {
  const min = Math.floor(timeLeft / 60);
  const sec = timeLeft % 60;
  timerEl.textContent = `${min}:${sec.toString().padStart(2,"0")}`;
  if(timeLeft <= 0) {
    clearInterval(timerInterval);
    alert("Tiempo terminado. Se cancelará este intento.");
    window.location.reload();
  }
  timeLeft--;
}, 1000);

// Cancelar al cambiar de pestaña
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    alert("Cambio de pestaña detectado. Intento cancelado.");
    window.location.reload();
  }
});

// Enviar WL
document.getElementById("wlForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = {};
  formData.forEach((v,k) => data[k]=v);

  const res = await fetch("/submit-wl", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(data)
  });

  const result = await res.json();
  if(result.accepted) {
    alert("¡WL ACEPTADA!");
  } else {
    alert("WL RECHAZADA. Revisa Discord para otra oportunidad.");
  }
  window.location.href="/instructions.html";
});
