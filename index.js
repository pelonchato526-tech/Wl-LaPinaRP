const express = require('express');
const fetch = require('node-fetch'); // Node 18+ tiene fetch nativo, si no: npm install node-fetch@2
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const RESULT_CHANNEL_ID = process.env.RESULT_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

// Roles
const ROLE_ACCEPTED = '1453469378178846740';
const ROLE_REJECTED = '1453469439306760276';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Preguntas
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

// Usuarios que ya enviaron WL
const usuariosWL = new Map();

// --- Página de inicio ---
app.get('/', (req, res) => {
  const oauthLink = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds+email+openid`;
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>WL La Piña RP</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
<div class="card gradient-border" id="app">
  <img src="/logo.png" class="logo">
  <h1>La Piña RP</h1>
  <p>Lee las instrucciones antes de comenzar.</p>
  <p>Solo puedes enviar la WL una vez.</p>
  <a href="${oauthLink}"><button class="btn">Conectar con Discord y Comenzar</button></a>
</div>
</body>
</html>
`);
});

// --- Callback OAuth2 ---
app.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.send('❌ No se recibió código OAuth2');

    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', 'https://wl-discord.onrender.com/callback');

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const token = await tokenRes.json();
    if (token.error) return res.send(`❌ Error OAuth2: ${token.error_description}`);

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });

    const user = await userRes.json();
    const discordId = user.id;
    const username = user.username;

    if (usuariosWL.has(discordId)) {
      // Usuario ya envió WL
      const estado = usuariosWL.get(discordId);
      return res.send(`
        <html><body>
        <h1>Tu WL ya fue procesada</h1>
        <p>Estado: ${estado}</p>
        </body></html>
      `);
    }

    // Página de instrucciones antes de comenzar
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>WL La Piña RP - Instrucciones</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
<div class="card gradient-border" id="app">
  <img src="/logo.png" class="logo">
  <h1>WL La Piña RP</h1>
  <p>Lee cuidadosamente las preguntas antes de comenzar.</p>
  <button class="btn" id="startBtn">Comenzar WL</button>
</div>

<script>
  const preguntas = ${JSON.stringify(preguntas)};
  const discordId = "${discordId}";
  let respuestas = [];
  let current = 0;
  let tiempo = 900;
  let timerInterval;

  const startBtn = document.getElementById('startBtn');
  const app = document.getElementById('app');

  startBtn.onclick = () => {
    app.innerHTML = '<div id="timer" class="timer">Tiempo restante: 15:00</div>';
    showPregunta();
    timerInterval = setInterval(()=>{
      tiempo--;
      if(tiempo<=0){
        clearInterval(timerInterval);
        app.innerHTML="<h2>⛔ Tiempo agotado</h2>";
        return;
      }
      let m = Math.floor(tiempo/60).toString().padStart(2,'0');
      let s = (tiempo%60).toString().padStart(2,'0');
      document.getElementById('timer').innerText = "⏳ Tiempo restante: "+m+":"+s;
    },1000);
  }

  function showPregunta(){
    if(current >= preguntas.length) return enviarWL();
    app.innerHTML += \`
      <div id="question">\${preguntas[current]}</div>
      <textarea id="answer" placeholder="Escribe tu respuesta..."></textarea>
      <button class="btn" id="nextBtn">Siguiente</button>
    \`;
    document.getElementById('nextBtn').onclick = ()=>{
      const val = document.getElementById('answer').value.trim();
      if(!val) return alert('Debes responder la pregunta');
      respuestas.push(val);
      current++;
      showPregunta();
    };
  }

  async function enviarWL(){
    clearInterval(timerInterval);
    app.innerHTML="<h2>Enviando WL...</h2>";
    const res = await fetch('/wl-form', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({discordId,respuestas})
    });
    const data = await res.json();
    if(data.ok){
      app.innerHTML="<h2>✅ WL enviada correctamente</h2>";
    } else {
      app.innerHTML="<h2>❌ Error al enviar WL</h2>";
    }
  }

  window.onblur = ()=>{
    clearInterval(timerInterval);
    app.innerHTML="<h2>⛔ WL cancelada por cambiar de pestaña</h2>";
  }
</script>
</body>
</html>
`);
  } catch(e) {
    console.error(e);
    res.send('❌ Error interno');
  }
});

// --- WL Form ---
app.post('/wl-form', async (req, res) => {
  const { discordId, respuestas } = req.body;
  try {
    const wlChannel = await client.channels.fetch(WL_CHANNEL_ID);
    await wlChannel.send(`<@${discordId}> envió su WL:`);

    const embed = new EmbedBuilder()
      .setTitle('📄 Nueva WL enviada')
      .setDescription(respuestas.map((r,i)=>`**${i+1}.** ${r}`).join('\n\n'))
      .setColor('#FFD700');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`accept_${discordId}`).setLabel('✅ Aceptar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject_${discordId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger)
      );

    await wlChannel.send({ embeds:[embed], components:[row] });
    res.json({ ok:true });
  } catch(e) {
    console.error(e);
    res.json({ ok:false });
  }
});

// --- Bot botones ---
client.on(Events.InteractionCreate, async interaction => {
  if(!interaction.isButton()) return;
  const [action, discordId] = interaction.customId.split('_');
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(discordId).catch(()=>null);
  if(!member) return;

  const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle(action==='accept'?'✅ WL Aceptada':'❌ WL Rechazada')
    .setDescription(`<@${discordId}> ${action==='accept'?'fue aceptado':'fue rechazado'} a La Piña RP!`)
    .setColor(action==='accept'?'#00FF00':'#FF0000')
    .setImage(
      action==='accept'
      ? 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnh3N3duYXA4OW0wMG1samVyZTUxdzk1ZWF2MGh6dHhrYWJ5MzBsMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/sOzVzt9IWu2ECjLVfF/giphy.gif'
      : 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2VveW9waW94OGFicmcyeGZzZDZ1cG4zb3Y5eXh2OTFyMTE3OGZuNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/bGtF6Y5QRjmvjqamoL/giphy.gif'
    );

  // Enviar DM
  member.send({ embeds:[embed] }).catch(()=>null);
  await resultChannel.send({ embeds:[embed] });

  // Guardar estado WL
  usuariosWL.set(discordId, action==='accept'?'Aceptada':'Rechazada');

  await interaction.update({ content:`✅ WL ${action==='accept'?'aceptada':'rechazada'}`, components:[] });
});

client.login(TOKEN);
app.listen(PORT, ()=>console.log(`Servidor corriendo en puerto ${PORT}`));
