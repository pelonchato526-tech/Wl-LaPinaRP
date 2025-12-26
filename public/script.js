const preguntas = document.querySelectorAll('.pregunta');
const barra = document.getElementById('barra');
const temporizador = document.getElementById('temporizador');
const btnComenzar = document.getElementById('btnComenzar');
const instrucciones = document.getElementById('instrucciones');

let respuestas = [];
let index = 0;
let tiempo = 300; // 5 min por WL
let timerInterval;
let intentos = 0;
let discordId = localStorage.getItem('discordId'); // Guardado tras OAuth

function startTimer() {
  timerInterval = setInterval(() => {
    tiempo--;
    const min = Math.floor(tiempo/60);
    const seg = tiempo%60;
    temporizador.textContent = `${min}:${seg<10?'0'+seg:seg}`;
    if(tiempo<=0) cancelWL();
  },1000);
}

function cancelWL() {
  clearInterval(timerInterval);
  alert('WL cancelada por tiempo o cambio de página.');
  intentos++;
  if(intentos>=3){
    alert('Has alcanzado el máximo de intentos.');
    btnComenzar.disabled = true;
  } else {
    location.reload();
  }
}

window.addEventListener('beforeunload', e=>{
  if(index>0) cancelWL();
});

btnComenzar.addEventListener('click', ()=>{
  if(!discordId){
    alert('No estás autorizado.');
    return;
  }
  instrucciones.style.display='none';
  document.getElementById('formWL').style.display='block';
  startTimer();
});

document.getElementById('formWL').addEventListener('submit', async e=>{
  e.preventDefault();
  const inputs = document.querySelectorAll('.respuesta');
  respuestas = Array.from(inputs).map(i=>i.value);
  barra.style.width = '100%';

  const res = await fetch('/wl-form',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ discordId, respuestas })
  });
  const data = await res.json();
  if(data.error){
    alert(data.error);
    return;
  }
  alert('WL enviada!');
  clearInterval(timerInterval);
  btnComenzar.disabled = true;
});
