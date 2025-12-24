// index.js
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch'); // Si Node <18
const { Client, GatewayIntentBits } = require('discord.js');

// --- Config Discord desde variables de entorno ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const RESULT_CHANNEL_ID = process.env.RESULT_CHANNEL_ID;

// --- Express ---
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Página principal bonita
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>WL Discord</title>
        <style>
          body { font-family: Arial; text-align: center; margin-top: 50px; background: #2f3136; color: #fff; }
          h1 { color: #7289da; }
          button { padding: 10px 20px; background: #7289da; border: none; color: #fff; border-radius: 5px; cursor: pointer; font-size: 16px; }
          button:hover { background: #5b6eae; }
        </style>
      </head>
      <body>
        <h1>Bienvenido a la WL de Discord</h1>
        <a href="https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent('https://wl-discord.onrender.com/callback')}&scope=identify+guilds">
          <button>Conectar con Discord</button>
        </a>
      </body>
    </html>
  `);
});

// --- Callback OAuth2 ---
app.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.send('No se recibió código OAuth2');

    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', TOKEN);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', 'https://wl-discord.onrender.com/callback');

    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const data = await response.json();

    if (data.error) {
      console.error(data);
      return res.send('Error en OAuth2: ' + data.error_description);
    }

    // Obtener info del usuario
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${data.access_token}` }
    });
    const userData = await userResponse.json();

    // Mandar mensaje al canal de resultados
    const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);
    await resultChannel.send(`<@${userData.id}> se conectó a la WL ✅`);

    res.send(`<h2>Autenticación completada! Bienvenido, ${userData.username}</h2>`);
  } catch (err) {
    console.error(err);
    res.send('Error interno en el servidor, intenta de nuevo.');
  }
});

// --- Endpoint WL-form ---
app.post('/wl-form', async (req, res) => {
  try {
    const { discordId, respuestas } = req.body;
    if (!discordId) return res.status(400).json({ error: 'Falta discordId' });

    // Lógica de aceptación (personalizable)
    const aceptado = true;

    const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);
    await resultChannel.send(`<@${discordId}> fue ${aceptado ? 'aceptado' : 'rechazado'}`);

    res.json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// --- Discord bot ---
client.on('ready', () => {
  console.log(`Bot listo! ${client.user.tag}`);
});

// Escuchar canal WL en Discord
client.on('messageCreate', async message => {
  try {
    if (message.channel.id === WL_CHANNEL_ID && !message.author.bot) {
      const aceptado = true; // tu lógica
      const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);
      await resultChannel.send(`${message.author.tag} fue ${aceptado ? 'aceptado' : 'rechazado'}`);
    }
  } catch (err) {
    console.error('Error procesando mensaje WL:', err);
  }
});

client.login(TOKEN);

// --- Start server Render ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor web corriendo en puerto ${PORT}`));
