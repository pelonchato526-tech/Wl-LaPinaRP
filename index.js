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

// ROLES
const ROLE_ACCEPTED = '1453469378178846740';
const ROLE_REJECTED = '1453469439306760276';

// OAUTH FIJO (EL BUENO)
const OAUTH_URL =
  'https://discord.com/oauth2/authorize?client_id=1427423357565014056&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds+email+openid';

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
app.use(express.static('public')); // logo.png

// PREGUNTAS WL
const preguntas = [
  "¿Qué es el MetaGaming (MG)?",
  "Si mueres y reapareces en hospital (PK), ¿qué haces?",
  "¿Qué es PowerGaming (PG)?",
  "Te apuntan con un arma, ¿cómo reaccionas?",
  "¿Qué significa OOC?",
  "¿Qué es VDM?",
  "¿Qué haces si alguien rompe reglas?",
  "¿Qué es Combat Logging?",
  "¿Qué es Bunny Jump?",
  "¿Se permiten temas OOC por voz?",
  "¿Qué es RDM?",
  "¿Qué es valorar la vida?"
];

// HOME
app.get('/', (req, res) => {
  res.send(`
  <html>
  <head>
    <title>WL Piña RP</title>
    <style>
      body { background:#000; color:#fff; font-family:Arial; text-align:center; margin-top:40px; }
      h1 { color:#FFD700; font-size:46px; }
      p { font-size:20px; }
      button { padding:15px 35px; background:#FFD700; border:none; border-radius:8px; font-size:22px; cursor:pointer; }
      button:hover { background:#e6c200; }
      img { width:200px; margin-bottom:25px; }
      footer { margin-top:50px; color:#777; font-size:14px; }
    </style>
  </head>
  <body>
    <img src="/logo.png">
    <h1>Piña RP - Whitelist</h1>
    <p>Lee las instrucciones antes de iniciar.</p>
    <p>⏱️ Tienes 15 minutos para completar la WL.</p>
    <a href="${OAUTH_URL}"><button>Conectar con Discord</button></a>
    <footer>© 2025 La Piña RP</footer>
  </body>
  </html>
  `);
});

// CALLBACK OAUTH
app.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.send('❌ No se recibió código OAuth2');

    const params = new URLSearchParams();
    params.append('client_id', '1427423357565014056');
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', 'https://wl-discord.onrender.com/callback');

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) return res.send('❌ Error OAuth');

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const user = await userRes.json();

    res.send(`
    <html>
    <head>
      <title>WL Piña RP</title>
      <style>
        body { background:#000; color:#fff; font-family:Arial; text-align:center; }
        h2 { color:#FFD700; }
        input { width:400px; padding:10px; border-radius:6px; border:none; font-size:18px; }
        button { padding:12px 30px; background:#FFD700; border:none; border-radius:6px; font-size:18px; margin-top:15px; cursor:pointer; }
        #timer { margin-top:10px; font-size:20px; color:#FFD700; }
        footer { margin-top:40px; color:#777; font-size:14px; }
      </style>
    </head>
    <body>
      <h2>WL - ${user.username}</h2>
      <div id="timer">15:00</div>
      <div id="box">
        <button onclick="start()">Comenzar WL</button>
      </div>
      <footer>© 2025 La Piña RP</footer>

      <script>
        const preguntas = ${JSON.stringify(preguntas)};
        let i = 0;
        let respuestas = [];
        let tiempo = 900;

        const box = document.getElementById('box');
        const timer = document.getElementById('timer');

        setInterval(() => {
          if (tiempo <= 0) {
            box.innerHTML = "⏰ Tiempo agotado";
            return;
          }
          tiempo--;
          let m = Math.floor(tiempo / 60);
          let s = tiempo % 60;
          timer.innerText = \`\${m.toString().padStart(2,'0')}:\${s.toString().padStart(2,'0')}\`;
        }, 1000);

        function start() {
          mostrar();
        }

        function mostrar() {
          box.innerHTML = \`
            <p>\${preguntas[i]}</p>
            <input id="r">
            <br>
            <button onclick="next()">Siguiente</button>
          \`;
        }

        async function next() {
          const r = document.getElementById('r').value;
          if (!r) return alert("Responde la pregunta");
          respuestas.push(r);
          i++;
          if (i < preguntas.length) {
            mostrar();
          } else {
            box.innerHTML = "Enviando WL...";
            await fetch('/wl-form', {
              method: 'POST',
              headers: {'Content-Type':'application/json'},
              body: JSON.stringify({ id: "${user.id}", respuestas })
            });
            box.innerHTML = "✅ WL enviada con éxito";
          }
        }
      </script>
    </body>
    </html>
    `);

  } catch (e) {
    console.error(e);
    res.send('Error interno');
  }
});

// WL FORM
app.post('/wl-form', async (req, res) => {
  const { id, respuestas } = req.body;
  const channel = await client.channels.fetch(WL_CHANNEL_ID);

  await channel.send(`<@${id}> envió su WL:`);

  const embed = new EmbedBuilder()
    .setTitle('📄 Nueva WL')
    .setDescription(respuestas.map((r,i)=>`**${i+1}.** ${r}`).join('\n'))
    .setColor('#FFD700');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`accept_${id}`).setLabel('Aceptar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`reject_${id}`).setLabel('Rechazar').setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds:[embed], components:[row] });
  res.json({ ok:true });
});

// BOTONES
client.on(Events.InteractionCreate, async i => {
  if (!i.isButton()) return;
  const [action, id] = i.customId.split('_');
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(id);

  if (action === 'accept') await member.roles.add(ROLE_ACCEPTED);
  if (action === 'reject') await member.roles.add(ROLE_REJECTED);

  const embed = new EmbedBuilder()
    .setTitle(action === 'accept' ? 'WL Aceptada' : 'WL Rechazada')
    .setColor(action === 'accept' ? '#00FF00' : '#FF0000')
    .setImage(
      action === 'accept'
        ? 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnJhMjd3bmp3dnU5dDYyZDExcXNpNWI3OXJjY3MwOXBrOHlzajhiayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/IgUASPYFJ5DjRMs2xx/giphy.gif'
        : 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExb2dqNjQxNTBibzUzbmpjanpnMnZhcXg2aWVncXkwN3V6ZGc3eHAyMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/vaxN3AaED9UZ6GyCpg/giphy.gif'
    );

  await i.update({ embeds:[embed], components:[] });
});

client.login(TOKEN);
app.listen(PORT, () => console.log('Servidor ON'));
