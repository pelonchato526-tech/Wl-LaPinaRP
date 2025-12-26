const params = new URLSearchParams(location.search);
const uid = params.get("uid");

const questions = [
"¿Qué es el MetaGaming (MG)?",
"Si mueres y reapareces (PK), ¿qué haces?",
"¿Qué es PowerGaming (PG)?",
"Te atracan con un arma, ¿cómo actúas?",
"¿Qué es OOC?",
"¿Qué es VDM?",
"¿Qué haces si ves a alguien rompiendo reglas?",
"¿Qué es Combat Logging?",
"¿Qué es Bunny Jump?",
"¿Se puede hablar de la vida real por voz?",
"¿Qué es RDM?",
"¿Qué significa valorar la vida?"
];

const qDiv = document.getElementById("questions");

function start() {
  document.getElementById("intro").style.display = "none";
  document.getElementById("form").style.display = "block";

  fetch("/start", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({discordId:uid})
  });

  questions.forEach((q,i)=>{
    qDiv.innerHTML += `<p>${q}</p><textarea required></textarea>`;
  });
}

document.getElementById("form").onsubmit = async e => {
  e.preventDefault();
  const answers = [...document.querySelectorAll("textarea")].map(t=>t.value);

  const r = await fetch("/submit", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({discordId:uid, answers})
  });

  const j = await r.json();
  if (j.ok) alert("WL enviada");
};
