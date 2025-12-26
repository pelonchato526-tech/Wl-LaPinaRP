const params = new URLSearchParams(location.search);
const uid = params.get("uid");
const name = params.get("name");

if (!uid) document.body.innerHTML = "No autorizado";

document.getElementById("user").innerText = name;

const questions = [
  "¿Qué es MG?",
  "¿Qué es PG?",
  "¿Qué es RDM?",
  "¿Qué es VDM?",
  "¿Qué es valorar la vida?"
];

let i = 0;
let answers = [];
let time = 900;

const q = document.getElementById("q");
const a = document.getElementById("a");
const p = document.getElementById("progress");
const t = document.getElementById("timer");

q.innerText = questions[i];

setInterval(() => {
  time--;
  t.innerText = `Tiempo: ${Math.floor(time/60)}:${time%60}`;
  if (time <= 0) location.reload();
}, 1000);

document.getElementById("next").onclick = async () => {
  if (!a.value) return;
  answers.push(a.value);
  a.value = "";
  i++;
  p.style.width = `${(i / questions.length) * 100}%`;

  if (i >= questions.length) {
    const r = await fetch("/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordId: uid, answers })
    });
    const j = await r.json();
    document.body.innerHTML = j.ok ? "WL enviada" : j.error;
  } else {
    q.innerText = questions[i];
  }
};

window.onblur = () => location.reload();
