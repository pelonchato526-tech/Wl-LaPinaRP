// index.js
const express = require('express');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const RESULT_CHANNEL_ID = process.env.RESULT_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

const ROLE_ACCEPTED = '1453469378178846740';
const ROLE_REJECTED = '1453469439306760276';

const client = new Client({ intents:[GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });
const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static('public'));

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

// --- Inicio con OAuth ---
app.get('/', (req,res)=>{
  const oauthLink = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds+email+openid`;
  res.send(`
<html>
<head>
<title>WL Piña RP</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<div class="card">
  <img class="logo" src="/logo.png" />
  <h1>La Piña RP</h1>
  <div class="subtitle">Sistema de Whitelist Oficial</div>
  <div class="instructions">
    • Lee cuidadosamente las instrucciones.<br>
    • Solo puedes enviar tu WL una vez.<br>
    • Tienes 15 minutos para completar.<br>
    • No puedes volver atrás.
  </div>
  <a href="${oauthLink}"><button class="btn">Conectar con Discord y Comenzar</button></a>
  <div class="footer">© 2025 La Piña RP</div>
</div>
</body>
</html>
  `);
});

// --- Callback OAuth2 ---
app.get('/callback', async (req,res)=>{
  try {
    const code = req.query.code;
    if(!code) return res.send('❌ No se recibió código OAuth2');

    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type','authorization_code');
    params.append('code',code);
    params.append('redirect_uri','https://wl-discord.onrender.com/callback');

    const tokenRes = await fetch('https://discord.com/api/oauth2/token',{
      method:'POST',
      body: params,
      headers:{'Content-Type':'application/x-www-form-urlencoded'}
    });

    const tokenData = await tokenRes.json();
    if(tokenData.error) return res.send(`❌ OAuth2 error: ${tokenData.error_description}`);

    const userRes = await fetch('https://discord.com/api/users/@me',{
      headers:{Authorization:`Bearer ${tokenData.access_token}`}
    });
    const userData = await userRes.json();

    const discordId = userData.id;
    const username = userData.username;

    res.send(`
<html>
<head>
<title>WL Piña RP</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<div class="card" id="app">
  <img class="logo" src="/logo.png"/>
  <h1>WL Formulario - ${username}</h1>
  <div id="progress-container"><div id="progress-bar"></div></div>
  <div id="form-container">
    <p>Presiona "Comenzar" para iniciar la WL.</p>
    <button id="startBtn" class="btn">Comenzar</button>
  </div>
  <div class="footer">© 2025 La Piña RP</div>
</div>

<script>
const preguntas = ${JSON.stringify(preguntas)};
let index = 0;
const respuestas = [];
let tiempo = 900;
const progressBar = document.getElementById('progress-bar');

const container = document.getElementById('form-container');
const startBtn = document.getElementById('startBtn');

startBtn.onclick = ()=> showQuestion();

function showQuestion(){
  const width = ((index)/preguntas.length)*100;
  progressBar.style.width = width + '%';

  container.innerHTML = \`
    <div id="question">\${preguntas[index]}</div>
    <textarea id="answer" placeholder="Escribe tu respuesta"></textarea>
    <button class="btn" id="nextBtn">Siguiente</button>
  \`;

  document.getElementById('nextBtn').onclick = ()=>{
    const val = document.getElementById('answer').value.trim();
    if(!val) return alert('Debes responder');
    respuestas.push(val);
    index++;
    if(index < preguntas.length){
      showQuestion();
    }else submitWL();
  };
}

function submitWL(){
  container.innerHTML = '<p>Enviando WL...</p>';
  fetch('/wl-form',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({discordId,respuestas})
  }).then(r=>r.json()).then(data=>{
    container.innerHTML = data.status==='ok'?'<h2>✅ WL enviada</h2>':'<h2>❌ Error</h2>';
  });
}

// Barra de tiempo
const timerEl = document.createElement('div');
timerEl.style.color = '#FFD700';
timerEl.style.marginTop = '15px';
document.getElementById('app').insertBefore(timerEl, container);
const timerInterval = setInterval(()=>{
  if(tiempo<=0){ clearInterval(timerInterval); container.innerHTML='<h2>⏰ Tiempo expirado</h2>'; return; }
  let min = Math.floor(tiempo/60);
  let sec = tiempo%60;
  timerEl.innerText = 'Tiempo restante: '+min.toString().padStart(2,'0')+':'+sec.toString().padStart(2,'0');
  tiempo--;
},1000);
</script>
</body>
</html>
    `);

  }catch(err){
    console.error(err);
    res.send('❌ Error interno');
  }
});

// --- Endpoint WL ---
app.post('/wl-form', async (req,res)=>{
  try{
    const { discordId,respuestas } = req.body;
    if(!discordId || !respuestas) return res.status(400).json({error:'Faltan datos'});

    const wlChannel = await client.channels.fetch(WL_CHANNEL_ID);
    await wlChannel.send(`<@${discordId}> envió su WL:`);

    const embed = new EmbedBuilder()
      .setTitle('📄 Nueva WL enviada')
      .setDescription(respuestas.map((r,i)=>`\n**${i+1}.** ${r}`).join(''))
      .setColor('#FFD700');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`accept_${discordId}`).setLabel('✅ Aceptar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject_${discordId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger)
      );

    await wlChannel.send({ embeds:[embed], components:[row] });
    res.json({status:'ok'});
  }catch(err){
    console.error(err);
    res.status(500).json({error:'Error interno'});
  }
});

// --- Bot botones ---
client.on(Events.InteractionCreate, async i=>{
  if(!i.isButton()) return;
  const [action,discordId] = i.customId.split('_');
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(discordId).catch(()=>null);
  if(!member) return;

  const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);

  if(action==='accept'){
    await member.roles.add(ROLE_ACCEPTED).catch(()=>null);
  }else{
    await member.roles.add(ROLE_REJECTED).catch(()=>null);
  }

  const embed = new EmbedBuilder()
    .setTitle(action==='accept'?'✅ WL Aceptada':'❌ WL Rechazada')
    .setDescription(`<@${discordId}> ${action==='accept'?'fue aceptado':'fue rechazado'} a La Piña RP!`)
    .setColor(action==='accept'?'#00FF00':'#FF0000')
    .setImage(
      action==='accept'
      ? 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnh3N3duYXA4OW0wMG1samVyZTUxdzk1ZWF2MGh6dHhrYWJ5MzBsMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/sOzVzt9IWu2ECjLVfF/giphy.gif'
      : 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2VveW9waW94OGFicmcyeGZzZDZ1cG4zb3Y5eXh2OTFyMTE3OGZuNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/bGtF6Y5QRjmvjqamoL/giphy.gif'
    );

  member.send({embeds:[embed]}).catch(()=>null);
  await resultChannel.send({embeds:[embed]});
  await i.update({content:action==='accept'?'✅ WL aceptada':'❌ WL rechazada', components:[], embeds:i.message.embeds});
});

client.on('ready', ()=>console.log(`Bot listo ${client.user.tag}`));
client.login(TOKEN);

app.listen(PORT, ()=>console.log(`Servidor corriendo en puerto ${PORT}`));
