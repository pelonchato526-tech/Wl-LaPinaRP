let time = 300;
let interval;
let attempts = Number(localStorage.getItem("attempts") || 0);

const startBtn = document.getElementById("start");
const form = document.getElementById("form");
const bar = document.getElementById("bar");
const timeSpan = document.getElementById("time");

if (attempts >= 3) {
  alert("Superaste el máximo de intentos.");
  startBtn.disabled = true;
}

startBtn.onclick = () => {
  startBtn.hidden = true;
  form.hidden = false;

  interval = setInterval(() => {
    time--;
    timeSpan.textContent = time;
    bar.style.width = `${((300 - time) / 300) * 100}%`;

    if (time <= 0) cancel();
  }, 1000);
};

document.addEventListener("visibilitychange", () => {
  if (document.hidden) cancel();
});

function cancel() {
  clearInterval(interval);
  attempts++;
  localStorage.setItem("attempts", attempts);
  alert("Intento cancelado");
  location.reload();
}
