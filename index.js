// index.js
const express = require('express');
const fetch = require('node-fetch');
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const RESULT_CHANNEL_ID = process.env.RESULT_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

// Roles
const ROLE_ACCEPTED = '1453469378178846740';
const ROLE_REJECTED = '1453469439306760276';

// OAuth FIJO (EL TUYO)
const OAUTH_URL =
  'https://discord.com/oauth2/authorize?client_id=1453271207490355284&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds+email+openid';

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

// Preguntas WL
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

// Página inicio
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>WL La Piña RP</title>
  <style>
    body { background:#000; color:#fff; font-family:Arial; text-align:center; }
    h1 { color:#FFD700; font-size:48px; }
    p { font-size:20px; }
    button {
      background:#FFD700;
      color:#000;
      padding:15px 35px;
      font-size:22px;
      border:none;
      border-radius:10px;
      cursor:pointer;
    }
    #logo { width:220px; margin:30px; }
    footer { margin-top:50px; color:#777; }
  </style>
</head>
<body>
  <img id="logo" src="/logo.png">
  <h1>Whitelist La Piña RP</h1>
  <p>Lee las instrucciones antes de comenzar.</p>
  <p>Solo puedes enviar la WL una vez.</p>
  <a href="${OAUTH_URL}">
    <button>Conectar con Discord</button>
  </a>
  <footer>© 2025 La Piña RP</footer>
</body>
</html>
`);
});

// Callback OAuth2
app.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.send('❌ No se recibió código OAuth2');

    const params = new URLSearchParams();
    params.append('client_id', '1453271207490355284');
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append(
      'redirect_uri',
      'https://wl-discord.onrender.com/callback'
    );

    const tokenRes = await fetch(
      'https://discord.com/api/oauth2/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      }
    );

    const token = await tokenRes.json();
    if (token.error) return res.send('❌ Error OAuth2');

    const userRes = await fetch(
      'https://discord.com/api/users/@me',
      {
        headers: { Authorization: `Bearer ${token.access_token}` }
      }
    );

    const user = await userRes.json();

    res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>WL Formulario</title>
  <style>
    body { background:#000; color:#fff; text-align:center; font-family:Arial; }
    #logo { width:180px; margin:20px; }
    #timer { color:#FFD700; font-size:22px; }
    input { width:60%; padding:12px; font-size:18px; border-radius:8px; }
    button { margin-top:20px; padding:12px 30px; font-size:20px; background:#FFD700; border:none; border-radius:8px; }
  </style>
</head>
<body>
  <img id="logo" src="/logo.png">
  <h1>Formulario WL - ${user.username}</h1>
  <div id="timer">Tiempo restante: 15:00</div>
  <div id="app"></div>

<script>
const preguntas = ${JSON.stringify(preguntas)};
let i = 0;
let respuestas = [];
let tiempo = 900;
const app = document.getElementById('app');

setInterval(() => {
  if (tiempo <= 0) {
    app.innerHTML = '<h2>⏰ Tiempo agotado</h2>';
    return;
  }
  let m = Math.floor(tiempo / 60);
  let s = tiempo % 60;
  document.getElementById('timer').innerText =
    'Tiempo restante: ' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  tiempo--;
}, 1000);

function mostrar() {
  app.innerHTML = \`
    <h2>\${preguntas[i]}</h2>
    <input id="r">
    <br>
    <button onclick="next()">Listo</button>
  \`;
}

function next() {
  const v = document.getElementById('r').value.trim();
  if (!v) return alert('Responde la pregunta');
  respuestas.push(v);
  i++;
  if (i < preguntas.length) mostrar();
  else enviar();
}

async function enviar() {
  app.innerHTML = 'Enviando WL...';
  await fetch('/wl-form', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      discordId: "${user.id}",
      respuestas
    })
  });
  app.innerHTML = '✅ WL enviada correctamente';
}

mostrar();
</script>
</body>
</html>
`);
  } catch (e) {
    console.error(e);
    res.send('❌ Error interno');
  }
});

// Enviar WL a Discord
app.post('/wl-form', async (req, res) => {
  const { discordId, respuestas } = req.body;
  const ch = await client.channels.fetch(WL_CHANNEL_ID);

  await ch.send(`<@${discordId}> envió su WL`);

  const embed = new EmbedBuilder()
    .setTitle('📄 Nueva Whitelist')
    .setDescription(
      respuestas.map((r,i)=>`**${i+1}.** ${r}`).join('\n\n')
    )
    .setColor('#FFD700');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`accept_${discordId}`)
      .setLabel('Aceptar')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`reject_${discordId}`)
      .setLabel('Rechazar')
      .setStyle(ButtonStyle.Danger)
  );

  await ch.send({ embeds:[embed], components:[row] });
  res.json({ ok:true });
});

// Botones
client.on(Events.InteractionCreate, async i => {
  if (!i.isButton()) return;
  const [act, id] = i.customId.split('_');
  const g = await client.guilds.fetch(GUILD_ID);
  const m = await g.members.fetch(id);

  if (act === 'accept') await m.roles.add(ROLE_ACCEPTED);
  if (act === 'reject') await m.roles.add(ROLE_REJECTED);

  const embed = new EmbedBuilder()
    .setTitle(act === 'accept' ? '✅ WL Aceptada' : '❌ WL Rechazada')
    .setDescription(`<@${id}>`)
    .setImage(
      act === 'accept'
        ? 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnJhMjd3bmp3dnU5dDYyZDExcXNpNWI3OXJjY3MwOXBrOHlzajhiayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/IgUASPYFJ5DjRMs2xx/giphy.gif'
        : 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExb2dqNjQxNTBibzUzbmpjanpnMnZhcXg2aWVncXkwN3V6ZGc3eHAyMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/vaxN3AaED9UZ6GyCpg/giphy.gif'
    );

  await i.channel.send({ embeds:[embed] });
  await i.update({ components:[] });
});

client.login(TOKEN);
app.listen(PORT, () => console.log('Servidor listo'));
